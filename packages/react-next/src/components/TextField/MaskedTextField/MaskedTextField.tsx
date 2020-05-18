import * as React from 'react';
import { TextField } from '../TextField';
import { ITextField, ITextFieldProps } from '../TextField.types';
import { initializeComponentRef, KeyCodes } from '../../../Utilities';

import {
  clearNext,
  clearPrev,
  clearRange,
  DEFAULT_MASK_FORMAT_CHARS,
  getLeftFormatIndex,
  getMaskDisplay,
  getRightFormatIndex,
  IMaskValue,
  insertString,
  parseMask,
} from './inputMask';

/**
 * State for the MaskedTextField component.
 */
export interface IMaskedTextFieldState {
  /**
   * The mask string formatted with the input value.
   * This is what is displayed inside the TextField
   * @example
   *  `Phone Number: 12_ - 4___`
   */
  displayValue: string;
  /** The index into the rendered value of the first unfilled format character */
  maskCursorPosition?: number;
}

export const DEFAULT_MASK_CHAR = '_';

type InputChangeType = 'default' | 'backspace' | 'delete' | 'textPasted';

const useComponentRef = (
  props: ITextFieldProps,
  textField: React.RefObject<ITextField>,
  value: number,
  start: number,
  end: number,
) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      get value() {
        return value;
      },
      get start() {
        return start;
      },
      get end() {
        return end;
      },
      focus() {
        if (textField.current) {
          textField.current.focus();
          textField.current.blur();
          textField.current.select();
          textField.current.setSelectionStart(value);
          textField.current.setSelectionEnd(value);
          textField.current.setSelectionRange(start, end);
          textField.current && textField.current.selectionStart !== null ? textField.current.selectionStart : -1;
          textField.current && textField.current.selectionEnd ? textField.current.setSelectionEnd : -1;
        }
      },
    }),
    [value, start, end],
  );
};

export const MaskedTextField = (props: ITextFieldProps) => {
  const textField = React.useRef<ITextField>(null);
  // Translate mask into charData
  const [maskCursorPosition, setMaskCursorPosition] = React.useState();
  const [maskCharData, setMaskCharData] = React.useState<IMaskValue[]>(parseMask(props.mask, props.maskFormat));
  const [displayValue, setDisplayValue] = React.useState(getMaskDisplay(props.mask, maskCharData, props.maskChar));

  // The value of all filled format characters or undefined if not all format characters are filled
  const value = (): string | undefined => {
    let currentValue = '';
    for (let i = 0; i < maskCharData.length; i++) {
      if (!maskCharData[i].value) {
        return undefined;
      }
      currentValue += maskCharData[i].value;
    }
    return currentValue;
  };

  const setValue = (newValue: string): void => {
    let valueIndex = 0,
      charDataIndex = 0;
    while (valueIndex < newValue.length && charDataIndex < maskCharData.length) {
      // Test if the next character in the new value fits the next format character
      const testVal = newValue[valueIndex];
      if (maskCharData[charDataIndex].format.test(testVal)) {
        maskCharData[charDataIndex].value = testVal;
        charDataIndex++;
      }
      valueIndex++;
    }
  };

  // If an initial value is provided, use it to populate the format chars
  props.value !== undefined && setValue(props.value);
  // True if the TextField is focused
  let isFocused: boolean = false;
  // True if the TextField was not focused and it was clicked into
  let moveCursorOnMouseUp: boolean = false;
  // The stored selection data prior to input change events.
  let changeSelectionData: {
    changeType: InputChangeType;
    selectionStart: number;
    selectionEnd: number;
  } | null = null;

  if (props.mask !== props.mask || props.value !== props.value) {
    setMaskCharData(parseMask(props.mask, props.maskFormat));
    props.value !== undefined && setValue(props.value);
    setDisplayValue(getMaskDisplay(props.mask, maskCharData, props.maskChar));
  }

  // Move the cursor to the start of the mask format on update
  if (isFocused && maskCursorPosition !== undefined && textField.current) {
    textField.current.setSelectionRange(maskCursorPosition, maskCursorPosition);
  }

  const onFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (props.onFocus) {
      props.onFocus(event);
    }

    isFocused = true;

    // Move the cursor position to the leftmost unfilled position
    for (let i = 0; i < maskCharData.length; i++) {
      if (!maskCharData[i].value) {
        setMaskCursorPosition(maskCharData[i].displayIndex);
        break;
      }
    }
  };

  const onBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (props.onBlur) {
      props.onBlur(event);
    }
    isFocused = false;
    moveCursorOnMouseUp = true;
  };

  const onMouseDown = (event: React.MouseEvent<HTMLInputElement>) => {
    if (props.onMouseDown) {
      props.onMouseDown(event);
    }
    if (!isFocused) {
      moveCursorOnMouseUp = true;
    }
  };

  const onMouseUp = (event: React.MouseEvent<HTMLInputElement>) => {
    if (props.onMouseUp) {
      props.onMouseUp(event);
    }
    // Move the cursor on mouseUp after focusing the textField
    if (moveCursorOnMouseUp) {
      moveCursorOnMouseUp = false;
      // Move the cursor position to the rightmost unfilled position
      for (let i = 0; i < maskCharData.length; i++) {
        if (!maskCharData[i].value) {
          setMaskCursorPosition(maskCharData[i].displayIndex);
          break;
        }
      }
    }
  };

  const onInputChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, currentValue: string) => {
    if (changeSelectionData === null && textField.current) {
      changeSelectionData = {
        changeType: 'default',
        selectionStart: textField.current.selectionStart !== null ? textField.current.selectionStart : -1,
        selectionEnd: textField.current.selectionEnd !== null ? textField.current.selectionEnd : -1,
      };
    }
    if (!changeSelectionData) {
      return;
    }

    // The initial value of cursorPos does not mattertextField
    let cursorPos = 0;
    const { changeType, selectionStart, selectionEnd } = changeSelectionData;

    if (changeType === 'textPasted') {
      const charsSelected = selectionEnd - selectionStart,
        charCount = currentValue.length + charsSelected - displayValue.length,
        startPos = selectionStart,
        pastedString = currentValue.substr(startPos, charCount);

      // Clear any selected characters
      if (charsSelected) {
        setMaskCharData(clearRange(maskCharData, selectionStart, charsSelected));
      }
      cursorPos = insertString(maskCharData, startPos, pastedString);
    } else if (changeType === 'delete' || changeType === 'backspace') {
      // isDel is true If the characters are removed LTR, otherwise RTL
      const isDel = changeType === 'delete',
        charCount = selectionEnd - selectionStart;

      if (charCount) {
        // charCount is > 0 if range was deleted
        setMaskCharData(clearRange(maskCharData, selectionStart, charCount));
        cursorPos = getRightFormatIndex(maskCharData, selectionStart);
      } else {
        // If charCount === 0, there was no selection and a single character was deleted
        if (isDel) {
          setMaskCharData(clearNext(maskCharData, selectionStart));
          cursorPos = getRightFormatIndex(maskCharData, selectionStart);
        } else {
          setMaskCharData(clearPrev(maskCharData, selectionStart));
          cursorPos = getLeftFormatIndex(maskCharData, selectionStart);
        }
      }
    } else if (currentValue.length > displayValue.length) {
      // This case is if the user added characters
      const charCount = currentValue.length - displayValue.length,
        startPos = selectionEnd - charCount,
        enteredString = currentValue.substr(startPos, charCount);

      cursorPos = insertString(maskCharData, startPos, enteredString);
    } else if (currentValue.length <= displayValue.length) {
      /**
       * This case is reached only if the user has selected a block of 1 or more
       * characters and input a character replacing the characters they've selected.
       */
      const charCount = 1,
        selectCount = displayValue.length + charCount - currentValue.length,
        startPos = selectionEnd - charCount,
        enteredString = currentValue.substr(startPos, charCount);

      // Clear the selected range
      setMaskCharData(clearRange(maskCharData, startPos, selectCount));
      // Insert the printed character
      cursorPos = insertString(maskCharData, startPos, enteredString);
    }

    changeSelectionData = null;

    const newValue = getMaskDisplay(props.mask, maskCharData, props.maskChar);

    setDisplayValue(newValue);
    setMaskCursorPosition(cursorPos);

    // Perform onChange after input has been processed. Return value is expected to be the displayed text
    if (props.onChange) {
      props.onChange(ev, newValue);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { current } = textField;

    if (props.onKeyDown) {
      props.onKeyDown(event);
    }

    changeSelectionData = null;
    if (current && current.value) {
      const { keyCode, ctrlKey, metaKey } = event;

      // Ignore ctrl and meta keydown
      if (ctrlKey || metaKey) {
        return;
      }

      // On backspace or delete, store the selection and the keyCode
      if (keyCode === KeyCodes.backspace || keyCode === KeyCodes.del) {
        const selectionStart = (event.target as HTMLInputElement).selectionStart,
          selectionEnd = (event.target as HTMLInputElement).selectionEnd;

        // Check if backspace or delete press is valid.
        if (
          !(keyCode === KeyCodes.backspace && selectionEnd && selectionEnd > 0) &&
          !(keyCode === KeyCodes.del && selectionStart !== null && selectionStart < current.value.length)
        ) {
          return;
        }

        changeSelectionData = {
          changeType: keyCode === KeyCodes.backspace ? 'backspace' : 'delete',
          selectionStart: selectionStart !== null ? selectionStart : -1,
          selectionEnd: selectionEnd !== null ? selectionEnd : -1,
        };
      }
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    if (props.onPaste) {
      props.onPaste(event);
    }

    const selectionStart = (event.target as HTMLInputElement).selectionStart,
      selectionEnd = (event.target as HTMLInputElement).selectionEnd;
    // Store the paste selection range
    changeSelectionData = {
      changeType: 'textPasted',
      selectionStart: selectionStart !== null ? selectionStart : -1,
      selectionEnd: selectionEnd !== null ? selectionEnd : -1,
    };
  };

  useComponentRef(props, textField, maskCursorPosition, maskCursorPosition, maskCursorPosition);

  return (
    <TextField
      {...props}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onChange={onInputChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      value={displayValue || ''}
      componentRef={textField}
    />
  );
};
