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
import { useConst, useConstCallback } from '@uifabric/react-hooks';

export interface IMaskedTextFieldState {
  // Translate mask into charData
  maskCharData: IMaskValue[];
  /** True if the TextField is focused */
  isFocused: boolean;
  /** True if the TextField was not focused and it was clicked into */
  moveCursorOnMouseUp: boolean;
  /** The stored selection data prior to input change events. */
  changeSelectionData: {
    changeType: InputChangeType;
    selectionStart: number;
    selectionEnd: number;
  } | null;

  newProps: ITextFieldProps;
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

const setValue = (newValue: string, maskCharData: IMaskValue[]): void => {
  let valueIndex = 0;
  let charDataIndex = 0;

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

const useComponentRef = (
  props: ITextFieldProps,
  maskCharData: IMaskValue[],
  textField: React.RefObject<ITextField>,
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
        return setValue(newValue, maskCharData);
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
    [],
  );
};

export const DEFAULT_MASK_CHAR = '_';

type InputChangeType = 'default' | 'backspace' | 'delete' | 'textPasted';

export const MaskedTextField = (props: ITextFieldProps) => {
  const textField = React.useRef<ITextField>(null);

  const internalState = useConst<IMaskedTextFieldState>(() => ({
    maskCharData: parseMask(props.mask, props.maskFormat),
    isFocused: false,
    moveCursorOnMouseUp: false,
    changeSelectionData: null,
    newProps: props,
  }));

  // If an initial value is provided, use it to populate the format chars
  React.useEffect(() => {
    props.value !== undefined && setValue(props.value, internalState.maskCharData);
  }, [props, internalState.maskCharData]);

  /**
   * The mask string formatted with the input value.
   * This is what is displayed inside the TextField
   * @example
   *  `Phone Number: 12_ - 4___`
   */
  const [displayValue, setDisplayValue] = React.useState<string>(
    getMaskDisplay(props.mask, internalState.maskCharData, props.maskChar),
  );
  /** The index into the rendered value of the first unfilled format character */
  const [maskCursorPosition, setMaskCursorPosition] = React.useState<number>();

  const onFocus = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (props.onFocus) {
        props.onFocus(event);
      }

      internalState.isFocused = true;

      // Move the cursor position to the leftmost unfilled position
      for (let i = 0; i < internalState.maskCharData.length; i++) {
        if (!internalState.maskCharData[i].value) {
          setMaskCursorPosition(internalState.maskCharData[i].displayIndex);
          break;
        }
      }
    },
    [props, internalState.changeSelectionData],
  );

  const onBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (props.onBlur) {
        props.onBlur(event);
      }

      internalState.isFocused = false;
      internalState.moveCursorOnMouseUp = true;
    },
    [props, internalState.changeSelectionData],
  );

  const onMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      if (props.onMouseDown) {
        props.onMouseDown(event);
      }

      if (!internalState.isFocused) {
        internalState.moveCursorOnMouseUp = true;
      }
    },
    [props, internalState.isFocused, internalState.changeSelectionData],
  );

  const onMouseUp = React.useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      if (props.onMouseUp) {
        props.onMouseUp(event);
      }

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
    [internalState.moveCursorOnMouseUp, props],
  );

  const onInputChange = React.useCallback(
    (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, value: string) => {
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
        const charCount = value.length + charsSelected - displayValue.length;
        const startPos = selectionStart;
        const pastedString = value.substr(startPos, charCount);

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
      } else if (value.length > displayValue.length) {
        // This case is if the user added characters
        const charCount = value.length - displayValue.length;
        const startPos = selectionEnd - charCount;
        const enteredString = value.substr(startPos, charCount);

        cursorPos = insertString(internalState.maskCharData, startPos, enteredString);
      } else if (value.length <= displayValue.length) {
        /**
         * This case is reached only if the user has selected a block of 1 or more
         * characters and input a character replacing the characters they've selected.
         */
        const charCount = 1;
        const selectCount = displayValue.length + charCount - value.length;
        const startPos = selectionEnd - charCount;
        const enteredString = value.substr(startPos, charCount);

        // Clear the selected range
        internalState.maskCharData = clearRange(internalState.maskCharData, startPos, selectCount);
        // Insert the printed character
        cursorPos = insertString(internalState.maskCharData, startPos, enteredString);
      }

      internalState.changeSelectionData = null;

      const newValue = getMaskDisplay(props.mask, internalState.maskCharData, props.maskChar);

      setDisplayValue(newValue);
      setMaskCursorPosition(cursorPos);

      // Perform onChange after input has been processed. Return value is expected to be the displayed text
      if (props.onChange) {
        props.onChange(ev, newValue);
      }
    },
    [props, internalState.maskCharData, displayValue, internalState.changeSelectionData],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const { current } = textField;

      if (props.onKeyDown) {
        props.onKeyDown(event);
      }

      internalState.changeSelectionData = null;
      if (current && current.value) {
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
            !(keyCode === KeyCodes.del && selectionStart !== null && selectionStart < current.value.length)
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
    [KeyCodes, props, internalState.changeSelectionData],
  );

  const onPaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (props.onPaste) {
        props.onPaste(event);
      }

      const selectionStart = (event.target as HTMLInputElement).selectionStart;
      const selectionEnd = (event.target as HTMLInputElement).selectionEnd;
      // Store the paste selection range
      internalState.changeSelectionData = {
        changeType: 'textPasted',
        selectionStart: selectionStart !== null ? selectionStart : -1,
        selectionEnd: selectionEnd !== null ? selectionEnd : -1,
      };
    },
    [props, internalState.changeSelectionData, displayValue],
  );

  React.useEffect(() => {
    if (internalState.newProps.mask !== props.mask || internalState.newProps.value !== props.value) {
      internalState.maskCharData = parseMask(internalState.newProps.mask, internalState.newProps.maskFormat);
      internalState.newProps.value !== undefined && setValue(internalState.newProps.value, internalState.maskCharData);

      setDisplayValue(
        getMaskDisplay(internalState.newProps.mask, internalState.maskCharData, internalState.newProps.maskChar),
      );
    }

    internalState.newProps = props;
  }, [props, internalState.maskCharData]);

  React.useEffect(() => {
    // Move the cursor to the start of the mask format on update
    if (internalState.isFocused && maskCursorPosition !== undefined && textField.current) {
      textField.current.setSelectionRange(maskCursorPosition, maskCursorPosition);
    }
  }, [props, internalState.isFocused, maskCursorPosition, internalState.changeSelectionData]);

  useComponentRef(props, internalState.maskCharData, textField);

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

MaskedTextField.defaultProps = {
  maskChar: DEFAULT_MASK_CHAR,
  maskFormat: DEFAULT_MASK_FORMAT_CHARS,
};
