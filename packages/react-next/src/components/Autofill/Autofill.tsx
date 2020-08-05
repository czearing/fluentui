import * as React from 'react';
import { IAutofillProps, IAutofill } from './Autofill.types';
import { KeyCodes, getNativeProps, inputProperties, isIE11, Async, initializeComponentRef } from '../../Utilities';
import { useControllableValue, useConst, useMergedRefs, useSetTimeout } from '@uifabric/react-hooks';

export interface IAutofillState {
  autoFillEnabled: boolean;
  value: string;
  isComposing: boolean;
  nextProps: IAutofillProps;
}

const SELECTION_FORWARD = 'forward';
const SELECTION_BACKWARD = 'backward';

const useComponentRef = (
  componentRef: React.Ref<IAutofill> | undefined,
  internalState: IAutofillState,
  inputElement: React.RefObject<HTMLInputElement>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateValue: any,
) => {
  React.useImperativeHandle(
    componentRef,
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
      get isValueSelected(): boolean {
        return Boolean(
          inputElement.current && inputElement.current.selectionStart !== inputElement.current.selectionEnd,
        );
      },
      get value(): string {
        return internalState.value;
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
      focus() {
        inputElement.current && inputElement.current.focus();
      },

      clear() {
        internalState.autoFillEnabled = true;
        updateValue('', false);
        inputElement.current && inputElement.current.setSelectionRange(0, 0);
      },
    }),
    [],
  );
};

/**
 * {@docCategory Autofill}
 */
export const Autofill = React.forwardRef((props: IAutofillProps, forwardedRef: React.Ref<HTMLInputElement>) => {
  const inputElement = React.useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(inputElement, forwardedRef);
  const { setTimeout, clearTimeout } = useSetTimeout();
  const [displayValue, setDisplayValue] = useControllableValue('', props.defaultVisibleValue);
  const internalState = useConst<IAutofillState>(() => ({
    autoFillEnabled: true,
    value: props.defaultVisibleValue || '',
    isComposing: false,
    nextProps: props,
  }));

  const nativeProps = getNativeProps<React.InputHTMLAttributes<HTMLInputElement>>(props, inputProperties);

  // Composition events are used when the character/text requires several keystrokes to be completed.
  // Some examples of this are mobile text input and langauges like Japanese or Arabic.
  // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
  const onCompositionStart = React.useCallback((ev: React.CompositionEvent<HTMLInputElement>) => {
    internalState.isComposing = true;
    internalState.autoFillEnabled = false;
  }, []);

  // Composition events are used when the character/text requires several keystrokes to be completed.
  // Some examples of this are mobile text input and languages like Japanese or Arabic.
  // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
  const onCompositionUpdate = React.useCallback(() => {
    if (isIE11()) {
      updateValue(getCurrentInputValue(), true);
    }
  }, []);

  // Composition events are used when the character/text requires several keystrokes to be completed.
  // Some examples of this are mobile text input and langauges like Japanese or Arabic.
  // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
  const onCompositionEnd = React.useCallback((ev: React.CompositionEvent<HTMLInputElement>) => {
    const inputValue = getCurrentInputValue();
    tryEnableAutofill(inputValue, internalState.value, false, true);
    internalState.isComposing = false;
    // Due to timing, this needs to be async, otherwise no text will be selected.
    setTimeout(() => {
      // it's technically possible that the value of _isComposing is reset during this timeout,
      // so explicitly trigger this with composing=true here, since it is supposed to be the
      // update for composition end
      updateValue(getCurrentInputValue(), false);
    }, 0);
  }, []);

  const onClick = () => {
    if (internalState.value && internalState.value !== '' && internalState.autoFillEnabled) {
      internalState.autoFillEnabled = false;
    }
  };

  const onKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (props.onKeyDown) {
        props.onKeyDown(ev);
      }

      // If the event is actively being composed, then don't alert autofill.
      // Right now typing does not have isComposing, once that has been fixed any should be removed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(ev.nativeEvent as any).isComposing) {
        switch (ev.which) {
          case KeyCodes.backspace:
            internalState.autoFillEnabled = false;
            break;
          case KeyCodes.left:
          case KeyCodes.right:
            if (internalState.autoFillEnabled) {
              internalState.value = displayValue!;
              internalState.autoFillEnabled = false;
            }
            break;
          default:
            if (!internalState.autoFillEnabled) {
              if (props.enableAutofillOnKeyPress!.indexOf(ev.which) !== -1) {
                internalState.autoFillEnabled = true;
              }
            }
            break;
        }
      }
    },
    [props.onKeyDown],
  );

  const onInputChanged = React.useCallback((ev: React.FormEvent<HTMLElement>) => {
    const value: string = getCurrentInputValue(ev);

    if (!internalState.isComposing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tryEnableAutofill(value, internalState.value, (ev.nativeEvent as any).isComposing);
    }

    // If it is not IE11 and currently composing, update the value
    if (!(isIE11() && internalState.isComposing)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nativeEventComposing = (ev.nativeEvent as any).isComposing;
      const isComposing = nativeEventComposing === undefined ? internalState.isComposing : nativeEventComposing;
      updateValue(value, isComposing);
    }
  }, []);

  const onChanged = React.useCallback((): void => {
    // Swallow this event, we don't care about it
    // We must provide it because React PropTypes marks it as required, but onInput serves the correct purpose
    return;
  }, []);

  const getCurrentInputValue = (ev?: React.FormEvent<HTMLElement>): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (ev && ev.target && (ev.target as any).value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (ev.target as any).value;
    } else if (inputElement.current && inputElement.current.value) {
      return inputElement.current.value;
    } else {
      return '';
    }
  };

  /**
   * Attempts to enable autofill. Whether or not autofill is enabled depends on the input value,
   * whether or not any text is selected, and only if the new input value is longer than the old input value.
   * Autofill should never be set to true if the value is composing. Once compositionEnd is called, then
   * it should be completed.
   * See https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent for more information on composition.
   */
  const tryEnableAutofill = (newValue: string, oldValue: string, isComposing?: boolean, isComposed?: boolean): void => {
    if (
      !isComposing &&
      newValue &&
      inputElement.current &&
      inputElement.current.selectionStart === newValue.length &&
      !internalState.autoFillEnabled &&
      (newValue.length > oldValue.length || isComposed)
    ) {
      internalState.autoFillEnabled = true;
    }
  };

  const notifyInputChange = (newValue: string, composing: boolean): void => {
    if (props.onInputValueChange) {
      props.onInputValueChange(newValue, composing);
    }
  };

  /**
   * Updates the current input value as well as getting a new display value.
   * @param newValue - The new value from the input
   */
  const updateValue = (newValue: string, composing: boolean) => {
    // Only proceed if the value is nonempty and is different from the old value
    // This is to work around the fact that, in IE 11, inputs with a placeholder fire an onInput event on focus
    if (!newValue && newValue === internalState.value) {
      return;
    }
    internalState.value = props.onInputChange ? props.onInputChange(newValue, composing) : newValue;
    setDisplayValue(getDisplayValue(internalState.value, props.suggestedDisplayValue));
    notifyInputChange(internalState.value, composing);
  };

  /**
   * Returns a string that should be used as the display value.
   * It evaluates this based on whether or not the suggested value starts with the input value
   * and whether or not autofill is enabled.
   */
  const getDisplayValue = (inputValue: string, suggestedDisplayValue?: string): string => {
    let currentDisplayValue = inputValue;
    if (
      suggestedDisplayValue &&
      inputValue &&
      doesTextStartWith(suggestedDisplayValue, currentDisplayValue) &&
      internalState.autoFillEnabled
    ) {
      currentDisplayValue = suggestedDisplayValue;
    }
    return currentDisplayValue;
  };

  const doesTextStartWith = (text: string, startWith: string): boolean => {
    if (!text || !startWith) {
      return false;
    }
    return text.toLocaleLowerCase().indexOf(startWith.toLocaleLowerCase()) === 0;
  };

  React.useEffect(() => {
    if (props.updateValueInWillReceiveProps) {
      const updatedInputValue = props.updateValueInWillReceiveProps();
      // Don't update if we have a null value or the value isn't changing
      // the value should still update if an empty string is passed in
      if (updatedInputValue !== null && updatedInputValue !== internalState.value) {
        internalState.value = updatedInputValue;
      }
    }

    const newDisplayValue = getDisplayValue(internalState.value, internalState.nextProps.suggestedDisplayValue);

    if (typeof newDisplayValue === 'string') {
      setDisplayValue(newDisplayValue);
    }

    internalState.nextProps = props;
  }, [internalState.value, props]);

  React.useEffect(() => {
    const { suggestedDisplayValue, shouldSelectFullInputValueInComponentDidUpdate, preventValueSelection } = props;
    let differenceIndex = 0;

    if (preventValueSelection) {
      return;
    }

    if (
      internalState.autoFillEnabled &&
      internalState.value &&
      suggestedDisplayValue &&
      doesTextStartWith(suggestedDisplayValue, internalState.value)
    ) {
      let shouldSelectFullRange = false;

      if (shouldSelectFullInputValueInComponentDidUpdate) {
        shouldSelectFullRange = shouldSelectFullInputValueInComponentDidUpdate();
      }

      if (shouldSelectFullRange && inputElement.current) {
        inputElement.current.setSelectionRange(0, suggestedDisplayValue.length, SELECTION_BACKWARD);
      } else {
        while (
          differenceIndex < internalState.value.length &&
          internalState.value[differenceIndex].toLocaleLowerCase() ===
            suggestedDisplayValue[differenceIndex].toLocaleLowerCase()
        ) {
          differenceIndex++;
        }
        if (differenceIndex > 0 && inputElement.current) {
          inputElement.current.setSelectionRange(differenceIndex, suggestedDisplayValue.length, SELECTION_BACKWARD);
        }
      }
    }
  }, [props, internalState]);

  useComponentRef(props.componentRef, internalState, inputElement, updateValue());

  return (
    <input
      autoCapitalize="off"
      autoComplete="off"
      aria-autocomplete={'both'}
      {...nativeProps}
      ref={mergedRef}
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
});
