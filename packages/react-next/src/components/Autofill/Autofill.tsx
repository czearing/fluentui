import * as React from 'react';
import { IAutofillProps } from './Autofill.types';
import { KeyCodes, getNativeProps, inputProperties, isIE11 } from '../../Utilities';
import { useSetTimeout } from '@uifabric/react-hooks';

export interface IAutofillState {
  value: string;
  autoFillEnabled: boolean;
  isComposing: boolean;
  displayValue?: string;
}

const COMPONENT_NAME = 'Autofill';
const SELECTION_FORWARD = 'forward';
const SELECTION_BACKWARD = 'backward';

/**
 * {@docCategory Autofill}
 */

const useComponentRef = (
  props: IAutofillProps,
  inputElement: React.RefObject<HTMLInputElement>,
  updateValue: any,
  state: IAutofillState,
) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      get cursorLocation() {
        if (inputElement.current) {
          if (inputElement.current.selectionDirection !== SELECTION_FORWARD) {
            return inputElement.current.selectionEnd;
          } else {
            return inputElement.current.selectionStart;
          }
        } else {
          return -1;
        }
      },
      get value(): string {
        return state.value;
      },
      get selectionStart(): number | null {
        return inputElement.current ? inputElement.current.selectionStart : -1;
      },
      get selectionEnd(): number | null {
        return inputElement.current ? inputElement.current.selectionEnd : -1;
      },

      get inputElement(): HTMLInputElement | null {
        return inputElement.current;
      },
      get isValueSelected(): boolean {
        return Boolean(
          inputElement.current && inputElement.current.selectionStart !== inputElement.current.selectionEnd,
        );
      },
      focus() {
        inputElement.current && inputElement.current.focus();
      },
      clear() {
        state.autoFillEnabled = true;
        updateValue('', false);
        inputElement.current && inputElement.current.setSelectionRange(0, 0);
      },
    }),
    [state.value, updateValue, state.autoFillEnabled],
  );
};

export const Autofill = React.forwardRef<HTMLInputElement, React.PropsWithChildren<IAutofillProps>>(
  (props, inputElement: React.RefObject<HTMLInputElement>) => {
    const [displayValue, setDisplayValue] = React.useState(props.defaultVisibleValue || '');
    const [state] = React.useState<IAutofillState>({
      value: props.defaultVisibleValue || '',
      autoFillEnabled: true,
      isComposing: false,
    });

    // Composition events are used when the character/text requires several keystrokes to be completed.
    // Some examples of this are mobile text input and langauges like Japanese or Arabic.
    // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
    const onCompositionStart = (ev: React.CompositionEvent<HTMLInputElement>) => {
      state.isComposing = true;
      state.autoFillEnabled = false;
    };

    // Composition events are used when the character/text requires several keystrokes to be completed.
    // Some examples of this are mobile text input and languages like Japanese or Arabic.
    // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
    const onCompositionUpdate = () => {
      if (isIE11()) {
        updateValue(getCurrentInputValue(), true);
      }
    };

    const safeSetTimeout = useSetTimeout();

    // Composition events are used when the character/text requires several keystrokes to be completed.
    // Some examples of this are mobile text input and langauges like Japanese or Arabic.
    // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
    const onCompositionEnd = (ev: React.CompositionEvent<HTMLInputElement>) => {
      const inputValue = getCurrentInputValue();
      tryEnableAutofill(inputValue, state.value, false, true);
      state.isComposing = false;
      // Due to timing, this needs to be async, otherwise no text will be selected.
      safeSetTimeout(() => {
        // it's technically possible that the value of _isComposing is reset during this timeout,
        // so explicitly trigger this with composing=true here, since it is supposed to be the
        // update for composition end
        updateValue(getCurrentInputValue(), false);
      }, 0);
    };

    const onClick = () => {
      if (state.value && state.value !== '' && state.autoFillEnabled) {
        state.autoFillEnabled = false;
      }
    };

    const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (props.onKeyDown) {
        props.onKeyDown(ev);
      }
      // If the event is actively being composed, then don't alert autofill.
      // Right now typing does not have isComposing, once that has been fixed any should be removed.
      if (!(ev.nativeEvent as any).isComposing) {
        switch (ev.which) {
          case KeyCodes.backspace:
            state.autoFillEnabled = false;
            break;
          case KeyCodes.left:
          case KeyCodes.right:
            if (state.autoFillEnabled) {
              state.value = displayValue!;
              state.autoFillEnabled = false;
            }
            break;
          default:
            if (!state.autoFillEnabled) {
              if (props.enableAutofillOnKeyPress!.indexOf(ev.which) !== -1) {
                state.autoFillEnabled = true;
              }
            }
            break;
        }
      }
    };

    const getCurrentInputValue = (ev?: React.FormEvent<HTMLElement>): string => {
      if (ev && ev.target && (ev.target as any).value) {
        return (ev.target as any).value;
      } else if (inputElement.current && inputElement.current.value) {
        return inputElement.current.value;
      } else {
        return '';
      }
    };

    const onInputChanged = (ev: React.FormEvent<HTMLElement>) => {
      const currentValue: string = getCurrentInputValue(ev);
      if (!state.isComposing) {
        tryEnableAutofill(currentValue, state.value, (ev.nativeEvent as any).isComposing);
      }
      // If it is not IE11 and currently composing, update the value
      if (!(isIE11() && state.isComposing)) {
        const nativeEventComposing = (ev.nativeEvent as any).isComposing;
        const isComposingValue = nativeEventComposing === undefined ? state.isComposing : nativeEventComposing;
        updateValue(currentValue, isComposingValue);
      }
    };

    const onChanged = (): void => {
      // Swallow this event, we don't care about it
      // We must provide it because React PropTypes marks it as required, but onInput serves the correct purpose
      return;
    };

    const notifyInputChange = (newValue: string, composing: boolean): void => {
      if (props.onInputValueChange) {
        props.onInputValueChange(newValue, composing);
      }
    };

    const tryEnableAutofill = (
      newValue: string,
      oldValue: string,
      isComposingProps?: boolean,
      isComposedProps?: boolean,
    ): void => {
      if (
        !isComposingProps &&
        newValue &&
        inputElement.current &&
        inputElement.current.selectionStart === newValue.length &&
        !state.autoFillEnabled &&
        (newValue.length > oldValue.length || isComposedProps)
      ) {
        state.autoFillEnabled = true;
      }
    };

    // Updates the current input value as well as getting a new display value.
    const updateValue = (newValue: string, composing: boolean) => {
      // Only proceed if the value is nonempty and is different from the old value
      // This is to work around the fact that, in IE 11, inputs with a placeholder fire an onInput event on focus
      if (!newValue && newValue === state.value) {
        return;
      }
      state.value = props.onInputChange ? props.onInputChange(newValue, composing) : newValue;
      setDisplayValue(getDisplayValue(state.value, props.suggestedDisplayValue));
      notifyInputChange(state.value, composing);
    };

    /**
     * Returns a string that should be used as the display value.
     * It evaluates this based on whether or not the suggested value starts with the input value
     * and whether or not autofill is enabled.
     * @param inputValue - the value that the input currently has.
     * @param suggestedDisplayValue - the possible full value
     */
    const getDisplayValue = (inputValue: string, suggestedDisplayValue?: string): string => {
      let displayedValue = inputValue;
      if (
        suggestedDisplayValue &&
        inputValue &&
        doesTextStartWith(suggestedDisplayValue, displayedValue) &&
        state.autoFillEnabled
      ) {
        displayedValue = suggestedDisplayValue;
      }
      return displayedValue;
    };

    const doesTextStartWith = (text: string, startWith: string): boolean => {
      if (!text || !startWith) {
        return false;
      }
      return text.toLocaleLowerCase().indexOf(startWith.toLocaleLowerCase()) === 0;
    };

    if (props.updateValueInWillReceiveProps) {
      const updatedInputValue = props.updateValueInWillReceiveProps();
      // Don't update if we have a null value or the value isn't changing
      // the value should still update if an empty string is passed in
      if (updatedInputValue !== null && updatedInputValue !== state.value) {
        state.value = updatedInputValue;
      }
    }
    const newDisplayValue = getDisplayValue(state.value, props.suggestedDisplayValue);
    if (newDisplayValue !== displayValue) {
      setDisplayValue(newDisplayValue);
    }

    React.useEffect(() => {
      const { suggestedDisplayValue, shouldSelectFullInputValueInComponentDidUpdate, preventValueSelection } = props;
      let differenceIndex = 0;

      if (preventValueSelection) {
        return;
      }

      if (
        state.autoFillEnabled &&
        state.value &&
        suggestedDisplayValue &&
        doesTextStartWith(suggestedDisplayValue, state.value)
      ) {
        let shouldSelectFullRange = false;

        if (shouldSelectFullInputValueInComponentDidUpdate) {
          shouldSelectFullRange = shouldSelectFullInputValueInComponentDidUpdate();
        }

        if (shouldSelectFullRange && inputElement.current) {
          inputElement.current.setSelectionRange(0, suggestedDisplayValue.length, SELECTION_BACKWARD);
        } else {
          while (
            differenceIndex < state.value.length &&
            state.value[differenceIndex].toLocaleLowerCase() ===
              suggestedDisplayValue[differenceIndex].toLocaleLowerCase()
          ) {
            differenceIndex++;
          }
          if (differenceIndex > 0 && inputElement.current) {
            inputElement.current.setSelectionRange(differenceIndex, suggestedDisplayValue.length, SELECTION_BACKWARD);
          }
        }
      }
    }, [
      props.suggestedDisplayValue,
      props.shouldSelectFullInputValueInComponentDidUpdate,
      props.preventValueSelection,
      state.autoFillEnabled,
      state.value,
      displayValue,
    ]);

    useComponentRef(props, inputElement, updateValue, state);
    const nativeProps = getNativeProps<React.InputHTMLAttributes<HTMLInputElement>>(props, inputProperties);

    return (
      <input
        autoCapitalize="off"
        autoComplete="off"
        aria-autocomplete={'both'}
        {...nativeProps}
        ref={inputElement}
        value={displayValue}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCompositionEnd={onCompositionEnd}
        // TODO (Fabric 8?) - switch to calling only onChange. See notes in TextField._onInputChange.
        onChange={onChanged}
        onInput={onInputChanged}
        onKeyDown={onKeyDown}
        onClick={props.onClick ? props.onClick : onClick}
        data-lpignore
      />
    );
  },
);

Autofill.displayName = COMPONENT_NAME;
Autofill.defaultProps = {
  enableAutofillOnKeyPress: [KeyCodes.down, KeyCodes.up] as KeyCodes[],
};
