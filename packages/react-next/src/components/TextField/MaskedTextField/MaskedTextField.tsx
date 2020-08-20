import * as React from 'react';
import { TextField } from '../TextField';
import { ITextField, ITextFieldProps } from '../TextField.types';
import { KeyCodes } from '../../../Utilities';

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
import { useConst, usePrevious } from '@uifabric/react-hooks';

export interface IMaskedTextFieldState {
  // Translate mask into charData
  maskCharData: IMaskValue[];
  /** True if the TextField is focused */
  isFocused: boolean;
  /** True if the TextField was not focused and it was clicked into */
  moveCursorOnMouseUp: boolean;
  /** The stored selection data prior to input change events. */
  changeSelectionData: {
    changeType: 'default' | 'backspace' | 'delete' | 'textPasted';
    selectionStart: number;
    selectionEnd: number;
  } | null;
}

/**
 *  An array of data containing information regarding the format characters,
 *  their indices inside the display text, and their corresponding values.
 * @example
 * ```
 *  [
 *    { value: '1', displayIndex: 16, format: /[0-9]/ },
 *    { value: '2', displayIndex: 17, format: /[0-9]/ },
 *    { displayIndex: 18, format: /[0-9]/ },
 *    { value: '4', displayIndex: 22, format: /[0-9]/ },
 *    ...
 *  ]
 * ```
 */

const useComponentRef = (
  props: ITextFieldProps,
  maskCharData: IMaskValue[],
  textField: React.RefObject<ITextField>,
  setValue: (newValue: string) => void,
) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      /**
       * @returns The value of all filled format characters or undefined if not all format characters are filled
       */
      get value() {
        let initialValue = '';

        for (let i = 0; i < maskCharData.length; i++) {
          if (!maskCharData[i].value) {
            return undefined;
          }
          initialValue += maskCharData[i].value;
        }
        return initialValue;
      },

      get selectionStart() {
        return textField.current && textField.current.selectionStart !== null ? textField.current.selectionStart : -1;
      },

      get selectionEnd() {
        return textField.current?.selectionEnd ? textField.current?.selectionEnd : -1;
      },

      setValue(newValue: string) {
        return setValue(newValue);
      },

      focus() {
        textField.current?.focus?.();
      },

      blur() {
        textField.current?.blur?.();
      },

      select() {
        textField.current?.select?.();
      },

      setSelectionStart(value: number) {
        textField.current?.setSelectionStart?.(value);
      },

      setSelectionEnd(value: number) {
        textField.current?.setSelectionEnd?.(value);
      },

      setSelectionRange(start: number, end: number) {
        textField.current?.setSelectionRange?.(start, end);
      },
    }),
    [maskCharData, setValue, textField],
  );
};

export const DEFAULT_MASK_CHAR = '_';

export const MaskedTextField = (props: ITextFieldProps) => {
  const textField = React.useRef<ITextField>(null);

  const {
    value,
    mask,
    onChange,
    maskChar = DEFAULT_MASK_CHAR,
    maskFormat = DEFAULT_MASK_FORMAT_CHARS,
    onKeyDown,
    onPaste,
    onMouseUp,
    onBlur,
    onFocus,
    onMouseDown,
  } = props;

  const internalState = useConst<IMaskedTextFieldState>(() => ({
    maskCharData: parseMask(mask, maskFormat),
    isFocused: false,
    moveCursorOnMouseUp: false,
    changeSelectionData: null,
  }));

  /**
   * The mask string formatted with the input value.
   * This is what is displayed inside the TextField
   * @example
   *  `Phone Number: 12_ - 4___`
   */
  const [displayValue, setDisplayValue] = React.useState<string>(
    getMaskDisplay(mask, internalState.maskCharData, maskChar),
  );

  /** The index into the rendered value of the first unfilled format character */
  const [maskCursorPosition, setMaskCursorPosition] = React.useState<number>();

  const previousProps = usePrevious(props);

  const setValue = React.useCallback(
    (newValue: string): void => {
      let valueIndex = 0;
      let charDataIndex = 0;

      while (valueIndex < newValue.length && charDataIndex < internalState.maskCharData.length) {
        // Test if the next character in the new value fits the next format character
        const testVal = newValue[valueIndex];
        if (internalState.maskCharData[charDataIndex].format.test(testVal)) {
          internalState.maskCharData[charDataIndex].value = testVal;
          charDataIndex++;
        }
        valueIndex++;
      }
    },
    [internalState.maskCharData],
  );

  const onHandleFocus = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onFocus?.(event);

      internalState.isFocused = true;

      // Move the cursor position to the leftmost unfilled position
      for (let i = 0; i < internalState.maskCharData.length; i++) {
        if (!internalState.maskCharData[i].value) {
          setMaskCursorPosition(internalState.maskCharData[i].displayIndex);
          break;
        }
      }
    },
    [internalState, onFocus],
  );

  const onHandleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onBlur?.(event);

      internalState.isFocused = false;
      internalState.moveCursorOnMouseUp = true;
    },
    [internalState, onBlur],
  );

  const onHandleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      onMouseDown?.(event);

      if (!internalState.isFocused) {
        internalState.moveCursorOnMouseUp = true;
      }
    },
    [internalState, onMouseDown],
  );

  const onHandleMouseUp = React.useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      onMouseUp?.(event);

      // Move the cursor on mouseUp after focusing the textField
      if (internalState.moveCursorOnMouseUp) {
        internalState.moveCursorOnMouseUp = false;
        // Move the cursor position to the rightmost unfilled position
        for (let i = 0; i < internalState.maskCharData.length; i++) {
          if (!internalState.maskCharData[i].value) {
            setMaskCursorPosition(internalState.maskCharData[i].displayIndex);

            break;
          }
        }
      }
    },
    [internalState, onMouseUp],
  );

  const onInputChange = React.useCallback(
    (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, inputValue: string) => {
      if (internalState.changeSelectionData === null && textField.current) {
        internalState.changeSelectionData = {
          changeType: 'default',
          selectionStart: textField.current.selectionStart !== null ? textField.current.selectionStart : -1,
          selectionEnd: textField.current.selectionEnd !== null ? textField.current.selectionEnd : -1,
        };
      }
      if (!internalState.changeSelectionData) {
        return;
      }

      // The initial value of cursorPos does not matter
      let cursorPos = 0;
      const { changeType, selectionStart, selectionEnd } = internalState.changeSelectionData;

      if (changeType === 'textPasted') {
        const charsSelected = selectionEnd - selectionStart;
        const charCount = inputValue.length + charsSelected - displayValue.length;
        const startPos = selectionStart;
        const pastedString = inputValue.substr(startPos, charCount);

        // Clear any selected characters
        if (charsSelected) {
          internalState.maskCharData = clearRange(internalState.maskCharData, selectionStart, charsSelected);
        }
        cursorPos = insertString(internalState.maskCharData, startPos, pastedString);
      } else if (changeType === 'delete' || changeType === 'backspace') {
        // isDel is true If the characters are removed LTR, otherwise RTL
        const isDel = changeType === 'delete';
        const charCount = selectionEnd - selectionStart;

        if (charCount) {
          // charCount is > 0 if range was deleted
          internalState.maskCharData = clearRange(internalState.maskCharData, selectionStart, charCount);
          cursorPos = getRightFormatIndex(internalState.maskCharData, selectionStart);
        } else {
          // If charCount === 0, there was no selection and a single character was deleted
          if (isDel) {
            internalState.maskCharData = clearNext(internalState.maskCharData, selectionStart);
            cursorPos = getRightFormatIndex(internalState.maskCharData, selectionStart);
          } else {
            internalState.maskCharData = clearPrev(internalState.maskCharData, selectionStart);
            cursorPos = getLeftFormatIndex(internalState.maskCharData, selectionStart);
          }
        }
      } else if (inputValue.length > displayValue.length) {
        // This case is if the user added characters
        const charCount = inputValue.length - displayValue.length;
        const startPos = selectionEnd - charCount;
        const enteredString = inputValue.substr(startPos, charCount);

        cursorPos = insertString(internalState.maskCharData, startPos, enteredString);
      } else if (inputValue.length <= displayValue.length) {
        /**
         * This case is reached only if the user has selected a block of 1 or more
         * characters and input a character replacing the characters they've selected.
         */
        const charCount = 1;
        const selectCount = displayValue.length + charCount - inputValue.length;
        const startPos = selectionEnd - charCount;
        const enteredString = inputValue.substr(startPos, charCount);

        // Clear the selected range
        internalState.maskCharData = clearRange(internalState.maskCharData, startPos, selectCount);
        // Insert the printed character
        cursorPos = insertString(internalState.maskCharData, startPos, enteredString);
      }

      internalState.changeSelectionData = null;

      const newValue = getMaskDisplay(mask, internalState.maskCharData, maskChar);

      setDisplayValue(newValue);
      setMaskCursorPosition(cursorPos);

      // Perform onChange after input has been processed. Return value is expected to be the displayed text
      onChange?.(ev, newValue);
    },
    [displayValue.length, internalState, mask, maskChar, onChange],
  );

  const onHandleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);

      internalState.changeSelectionData = null;
      if (textField.current && textField.current.value) {
        const { keyCode, ctrlKey, metaKey } = event;

        // Ignore ctrl and meta keydown
        if (ctrlKey || metaKey) {
          return;
        }

        // On backspace or delete, store the selection and the keyCode
        if (keyCode === KeyCodes.backspace || keyCode === KeyCodes.del) {
          const selectionStart = (event.target as HTMLInputElement).selectionStart;
          const selectionEnd = (event.target as HTMLInputElement).selectionEnd;

          // Check if backspace or delete press is valid.
          if (
            !(keyCode === KeyCodes.backspace && selectionEnd && selectionEnd > 0) &&
            !(keyCode === KeyCodes.del && selectionStart !== null && selectionStart < textField.current.value.length)
          ) {
            return;
          }

          internalState.changeSelectionData = {
            changeType: keyCode === KeyCodes.backspace ? 'backspace' : 'delete',
            selectionStart: selectionStart !== null ? selectionStart : -1,
            selectionEnd: selectionEnd !== null ? selectionEnd : -1,
          };
        }
      }
    },
    [internalState, onKeyDown],
  );

  const onHandlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(event);

      const selectionStart = (event.target as HTMLInputElement).selectionStart;
      const selectionEnd = (event.target as HTMLInputElement).selectionEnd;
      // Store the paste selection range
      internalState.changeSelectionData = {
        changeType: 'textPasted',
        selectionStart: selectionStart !== null ? selectionStart : -1,
        selectionEnd: selectionEnd !== null ? selectionEnd : -1,
      };
    },
    [internalState, onPaste],
  );

  React.useEffect(() => {
    // Move the cursor to the start of the mask format on update
    if (internalState.isFocused && maskCursorPosition !== undefined && textField.current) {
      textField.current.setSelectionRange(maskCursorPosition, maskCursorPosition);
    }

    if (mask !== previousProps?.mask || value !== previousProps?.value) {
      internalState.maskCharData = parseMask(mask, maskFormat);
      value !== undefined && setValue(value);

      setDisplayValue(getMaskDisplay(mask, internalState.maskCharData, maskChar));
    }
  }, [
    internalState,
    mask,
    maskChar,
    maskCursorPosition,
    maskFormat,
    previousProps?.mask,
    previousProps?.value,
    setValue,
    value,
  ]);

  // If an initial value is provided, use it to populate the format chars
  value !== undefined && setValue(value);

  useComponentRef(props, internalState.maskCharData, textField, setValue);

  return (
    <TextField
      {...props}
      onFocus={onHandleFocus}
      onBlur={onHandleBlur}
      onMouseDown={onHandleMouseDown}
      onMouseUp={onHandleMouseUp}
      onChange={onInputChange}
      onKeyDown={onHandleKeyDown}
      onPaste={onHandlePaste}
      value={displayValue || ''}
      componentRef={textField}
    />
  );
};
