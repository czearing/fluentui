import * as React from 'react';
import { IAutofillProps } from './Autofill.types';
import { KeyCodes, getNativeProps, inputProperties, isIE11 } from '../../Utilities';

export interface IAutofillState {
  displayValue?: string;
}

const SELECTION_FORWARD = 'forward';
const SELECTION_BACKWARD = 'backward';

/**
 * {@docCategory Autofill}
 */

const useComponentRef = (
  props: IAutofillProps,
  inputElement: React.RefObject<HTMLInputElement>,
  autoFillEnabled: boolean,
  updateValue: any,
  value: string,
) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      get cursorLocation() {
        if (inputElement.current) {
          const inputElement = inputElement.current;
          if (inputElement.selectionDirection !== SELECTION_FORWARD) {
            return inputElement.selectionEnd;
          } else {
            return inputElement.selectionStart;
          }
        } else {
          return -1;
        }
      },
      get isValueSelected(): boolean {
        return Boolean(inputElement && inputElement.selectionStart !== inputElement.selectionEnd);
      },
      get value(): string {
        return value;
      },
      get selectionStart(): number | null {
        return inputElement.current ? inputElement.current.selectionStart : -1;
      },
      get selectionEnd(): number | null {
        return inputElement.current ? inputElement.current.selectionEnd : -1;
      },
      get inputElement(): HTMLInputElement | null {
        return this._inputElement.current;
      },
      focus() {
        inputElement.current && inputElement.current.focus();
      },
      clear() {
        autoFillEnabled = true;
        updateValue('', false);
        inputElement.current && inputElement.current.setSelectionRange(0, 0);
      },
    }),
    [],
  );
};

const COMPONENT_NAME = 'Autofill';

export const Autofill = (props: IAutofillProps) => {
  const [displayValue, setDisplayValue] = React.useState(props.defaultVisibleValue || '');
  const inputElement = React.useRef<HTMLInputElement>(null);

  let value: string = props.defaultVisibleValue || '';
  let autoFillEnabled = true;
  let isComposing: boolean = false;

  // Composition events are used when the character/text requires several keystrokes to be completed.
  // Some examples of this are mobile text input and langauges like Japanese or Arabic.
  // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
  const onCompositionStart = (ev: React.CompositionEvent<HTMLInputElement>) => {
    isComposing = true;
    autoFillEnabled = false;
  };

  // Composition events are used when the character/text requires several keystrokes to be completed.
  // Some examples of this are mobile text input and languages like Japanese or Arabic.
  // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
  const onCompositionUpdate = () => {
    if (isIE11()) {
      updateValue(getCurrentInputValue(), true);
    }
  };

  // Composition events are used when the character/text requires several keystrokes to be completed.
  // Some examples of this are mobile text input and langauges like Japanese or Arabic.
  // Find out more at https://developer.mozilla.org/en-US/docs/Web/Events/compositionstart
  const onCompositionEnd = (ev: React.CompositionEvent<HTMLInputElement>) => {
    const inputValue = getCurrentInputValue();
    tryEnableAutofill(inputValue, false, true);
    isComposing = false;
    // Due to timing, this needs to be async, otherwise no text will be selected.
    async.setTimeout(() => {
      // it's technically possible that the value of _isComposing is reset during this timeout,
      // so explicitly trigger this with composing=true here, since it is supposed to be the
      // update for composition end
      updateValue(getCurrentInputValue(), false);
    }, 0);
  };

  const onClick = () => {
    if (value && value !== '' && autoFillEnabled) {
      autoFillEnabled = false;
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
          autoFillEnabled = false;
          break;
        case KeyCodes.left:
        case KeyCodes.right:
          if (autoFillEnabled) {
            value = displayValue!;
            autoFillEnabled = false;
          }
          break;
        default:
          if (!autoFillEnabled) {
            if (props.enableAutofillOnKeyPress!.indexOf(ev.which) !== -1) {
              autoFillEnabled = true;
            }
          }
          break;
      }
    }
  };

  const onInputChanged = (ev: React.FormEvent<HTMLElement>) => {
    const currentValue: string = getCurrentInputValue(ev);
    if (!isComposing) {
      tryEnableAutofill(currentValue, (ev.nativeEvent as any).isComposing);
    }
    // If it is not IE11 and currently composing, update the value
    if (!(isIE11() && isComposing)) {
      const nativeEventComposing = (ev.nativeEvent as any).isComposing;
      const isComposingValue = nativeEventComposing === undefined ? isComposing : nativeEventComposing;
      updateValue(currentValue, isComposingValue);
    }
  };

  const onChanged = (): void => {
    // Swallow this event, we don't care about it
    // We must provide it because React PropTypes marks it as required, but onInput serves the correct purpose
    return;
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

  const tryEnableAutofill = (newValue: string, isComposingProps?: boolean, isComposedProps?: boolean): void => {
    if (
      !isComposingProps &&
      newValue &&
      inputElement.current &&
      inputElement.current.selectionStart === newValue.length &&
      !autoFillEnabled &&
      (newValue.length > value.length || isComposedProps)
    ) {
      autoFillEnabled = true;
    }
  };

  const notifyInputChange = (newValue: string, composing: boolean): void => {
    if (props.onInputValueChange) {
      props.onInputValueChange(newValue, composing);
    }
  };

  // Updates the current input value as well as getting a new display value.
  const updateValue = (newValue: string, composing: boolean) => {
    // Only proceed if the value is nonempty and is different from the old value
    // This is to work around the fact that, in IE 11, inputs with a placeholder fire an onInput event on focus
    if (!newValue && newValue === value) {
      return;
    }
    value = props.onInputChange ? props.onInputChange(newValue, composing) : newValue;
    setDisplayValue(getDisplayValue(value));
    notifyInputChange(value, composing);
  };

  /**
   * Returns a string that should be used as the display value.
   * It evaluates this based on whether or not the suggested value starts with the input value
   * and whether or not autofill is enabled.
   * @param inputValue - the value that the input currently has.
   * @param suggestedDisplayValue - the possible full value
   */
  const getDisplayValue = (inputValue: string): string => {
    let displayedValue = inputValue;
    if (
      props.suggestedDisplayValue &&
      inputValue &&
      doesTextStartWith(props.suggestedDisplayValue, displayedValue) &&
      autoFillEnabled
    ) {
      displayedValue = props.suggestedDisplayValue;
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
    if (updatedInputValue !== null && updatedInputValue !== value) {
      value = updatedInputValue;
    }
  }

  const newDisplayValue = getDisplayValue(value);

  if (typeof newDisplayValue === 'string') {
    setDisplayValue(newDisplayValue);
  }

  const { suggestedDisplayValue, shouldSelectFullInputValueInComponentDidUpdate, preventValueSelection } = props;
  let differenceIndex = 0;

  if (preventValueSelection) {
    return;
  }

  if (autoFillEnabled && value && suggestedDisplayValue && doesTextStartWith(suggestedDisplayValue, value)) {
    let shouldSelectFullRange = false;

    if (shouldSelectFullInputValueInComponentDidUpdate) {
      shouldSelectFullRange = shouldSelectFullInputValueInComponentDidUpdate();
    }

    if (shouldSelectFullRange && inputElement.current) {
      inputElement.current.setSelectionRange(0, suggestedDisplayValue.length, SELECTION_BACKWARD);
    } else {
      while (
        differenceIndex < value.length &&
        value[differenceIndex].toLocaleLowerCase() === suggestedDisplayValue[differenceIndex].toLocaleLowerCase()
      ) {
        differenceIndex++;
      }
      if (differenceIndex > 0 && inputElement.current) {
        inputElement.current.setSelectionRange(differenceIndex, suggestedDisplayValue.length, SELECTION_BACKWARD);
      }
    }
  }

  useComponentRef(props, inputElement, autoFillEnabled, updateValue(currentValue, isComposingValue), value);
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
};
