import * as React from 'react';
import { Label, ILabelStyleProps, ILabelStyles } from '../../Label';
import { Icon } from '../../Icon';
import {
  DelayedRender,
  IStyleFunctionOrObject,
  classNamesFunction,
  getNativeProps,
  inputProperties,
  textAreaProperties,
  warn,
  warnControlledUsage,
  warnMutuallyExclusive,
} from '../../Utilities';
import { ITextFieldProps, ITextFieldStyleProps, ITextFieldStyles } from './TextField.types';
import { useId, useBoolean, useControllableValue } from '@uifabric/react-hooks';

const getClassNames = classNamesFunction<ITextFieldStyleProps, ITextFieldStyles>();

/** @internal */
export interface ITextFieldState {
  latestValidateValue: string | undefined;
  lastChangeValue: string | undefined;
  hasWarnedNullValue: boolean | undefined;
  lastValidation: number;
  prevProps: ITextFieldProps;
  prevIsFocused: boolean;
  uncontrolledValue: string | undefined;
}

/** @internal */
export interface ITextFieldSnapshot {
  /**
   * If set, the text field is changing between single- and multi-line, so we'll need to reset
   * selection/cursor after the change completes.
   */
  selection?: [number | null, number | null];
}

const DEFAULT_STATE_VALUE = '';
const COMPONENT_NAME = 'TextField';
const onRenderStyles = { paddingBottom: '1px' };

const useComponentRef = (
  props: ITextFieldProps,
  textElement: React.RefObject<HTMLTextAreaElement | HTMLInputElement>,
  value: string | undefined,
) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      // Get the value from the given state and props (converting from number to string if needed
      get value() {
        if (typeof value === 'number') {
          // not allowed per typings, but happens anyway
          return String(value);
        }
        return value;
      },

      // Gets the selection start of the text field
      get selectionStart(): number | null {
        return textElement.current ? textElement.current.selectionStart : -1;
      },

      // Gets the selection end of the text field
      get selectionEnd(): number | null {
        return textElement.current ? textElement.current.selectionEnd : -1;
      },

      // Sets focus on the text field
      focus() {
        if (textElement.current) {
          textElement.current.focus();
        }
      },

      // Blurs the text field.
      blur() {
        if (textElement.current) {
          textElement.current.blur();
        }
      },

      // Selects the text field
      select() {
        if (textElement.current) {
          textElement.current.select();
        }
      },

      // Sets the selection start of the text field to a specified value
      setSelectionStart(index: number) {
        if (textElement.current) {
          textElement.current.selectionStart = index;
        }
      },

      getSnapshotBeforeUpdate(prevProps: ITextFieldProps, prevState: ITextFieldState): ITextFieldSnapshot | null {
        return {
          selection: [
            textElement.current ? textElement.current.selectionStart : -1,
            textElement.current ? textElement.current.selectionEnd : -1,
          ],
        };
      },

      // Sets the selection end of the text field to a specified value
      setSelectionEnd(index: number) {
        if (textElement.current) {
          textElement.current.selectionEnd = index;
        }
      },

      // Sets the start and end positions of a selection in a text field.
      // start - Index of the start of the selection.
      // end - Index of the end of the selection.
      setSelectionRange(start: number, end: number): void {
        if (textElement.current) {
          textElement.current.setSelectionRange(start, end);
        }
      },
    }),
    [value],
  );
};

export const TextFieldBase: React.FunctionComponent = React.forwardRef(
  (props: ITextFieldProps, ref: React.Ref<HTMLDivElement>) => {
    const textElement = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const fallbackId = useId(COMPONENT_NAME);
    const descriptionId = useId(COMPONENT_NAME + 'Description');
    const labelId = useId(COMPONENT_NAME + 'Label');
    props.checked, props.defaultChecked, props.onChange;
    const [currentValue, setCurrentValue] = useControllableValue(props.value, props.defaultValue, props.onChange);
    const [isFocused, { setTrue: setTrueIsFocused, setFalse: setFalseIsFocused }] = useBoolean(false);
    const [errorMessage, setErrorMessage] = React.useState<string | JSX.Element>('');

    const [state] = React.useState<ITextFieldState>({
      latestValidateValue: undefined,
      lastChangeValue: undefined,
      hasWarnedNullValue: undefined,
      lastValidation: 0,
      prevProps: props,
      prevIsFocused: isFocused,
      uncontrolledValue: undefined,
    });

    const [snapshot] = React.useState<ITextFieldSnapshot>({
      selection: [null, null],
    });

    let { defaultValue = DEFAULT_STATE_VALUE } = props;
    if (typeof defaultValue === 'number') {
      // This isn't allowed per the props, but happens anyway.
      defaultValue = String(defaultValue);
    }

    const getValue = (currentProps: ITextFieldProps): string | undefined => {
      const { value = currentValue } = currentProps;
      if (typeof value === 'number') {
        // not allowed per typings, but happens anyway
        return String(value);
      }
      return value;
    };

    const renderLabel = (labelProps: ITextFieldProps): JSX.Element | null => {
      // IProcessedStyleSet definition requires casting for what Label expects as its styles prop
      const labelStyles = classNames.subComponentStyles
        ? (classNames.subComponentStyles.label as IStyleFunctionOrObject<ILabelStyleProps, ILabelStyles>)
        : undefined;
      if (label) {
        return (
          <Label
            required={required}
            htmlFor={props.id || fallbackId}
            styles={labelStyles}
            disabled={labelProps.disabled}
            id={labelId}
          >
            {labelProps.label}
          </Label>
        );
      }
      return null;
    };

    const renderDescription = (descriptionProps: ITextFieldProps): JSX.Element | null => {
      if (descriptionProps.description) {
        return <span className={classNames.description}>{descriptionProps.description}</span>;
      }
      return null;
    };

    const renderPrefix = (prefixProps: ITextFieldProps): JSX.Element => {
      return <span style={onRenderStyles}>{prefixProps.prefix}</span>;
    };

    const renderSuffix = (suffixProps: ITextFieldProps): JSX.Element => {
      return <span style={onRenderStyles}>{suffixProps.suffix}</span>;
    };

    const shouldValidateAllChanges = (): boolean => {
      //  If `validateOnFocusIn` or `validateOnFocusOut` is true, validation should run **only** on that event.
      //  Otherwise, validation should run on every change.
      return !(props.validateOnFocusIn || props.validateOnFocusOut);
    };

    const {
      borderless,
      className,
      disabled,
      iconProps,
      inputClassName,
      label,
      multiline,
      required,
      underlined,
      prefix,
      resizable = true,
      suffix,
      theme,
      styles,
      autoAdjustHeight,
      deferredValidationTime = 200,
      onRenderPrefix = renderPrefix as ITextFieldProps['onRenderPrefix'],
      onRenderSuffix = renderSuffix as ITextFieldProps['onRenderSuffix'],
      onRenderLabel = renderLabel as ITextFieldProps['onRenderLabel'],
      onRenderDescription = renderDescription as ITextFieldProps['onRenderDescription'],
    } = props;

    const getErrorMessage = (): string | JSX.Element => {
      const { errorMessage: tempErrorMessage = errorMessage } = props;
      return tempErrorMessage || '';
    };

    const classNames = getClassNames(styles!, {
      theme: theme!,
      className,
      disabled,
      focused: isFocused,
      required,
      multiline,
      hasLabel: !!label,
      hasErrorMessage: !!getErrorMessage(),
      borderless,
      resizable,
      hasIcon: !!iconProps,
      underlined,
      inputClassName,
      autoAdjustHeight,
    });

    const validate = (validatedValue: string | undefined): void => {
      // In case _validate is called again while validation promise is executing
      if (state.latestValidateValue === validatedValue && shouldValidateAllChanges()) {
        return;
      }
      state.latestValidateValue = validatedValue;
      const result = props.onGetErrorMessage && props.onGetErrorMessage(validatedValue || '');
      if (result !== undefined) {
        if (typeof result === 'string' || !('then' in result)) {
          setErrorMessage(result);
          notifyAfterValidate(validatedValue, result);
        } else {
          const currentValidation: number = ++state.lastValidation;
          result.then((errorMessageValue: string | JSX.Element) => {
            if (currentValidation === state.lastValidation) {
              setErrorMessage(errorMessageValue);
            }
            notifyAfterValidate(validatedValue, errorMessageValue);
          });
        }
      } else {
        notifyAfterValidate(validatedValue, '');
      }
    };

    const notifyAfterValidate = (validatedValue: string | undefined, errorMessageProp: string | JSX.Element): void => {
      if (validatedValue && props.onNotifyValidationResult) {
        props.onNotifyValidationResult(errorMessageProp, validatedValue);
      }
    };

    const onFocus = (ev: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (props.onFocus) {
        props.onFocus(ev);
      }
      setTrueIsFocused();
      if (props.validateOnFocusIn) {
        validate(getValue(props));
      }
    };

    const onBlur = (ev: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (props.onBlur) {
        props.onBlur(ev);
      }
      setFalseIsFocused();
      if (props.validateOnFocusOut) {
        validate(getValue(props));
      }
    };

    const isDescriptionAvailable = (): boolean => {
      // If a custom description render function is supplied then treat description as always available.
      // Otherwise defer to the presence of description or error message text.
      return !!(props.onRenderDescription || props.description || errorMessage || '');
    };

    const renderTextArea = (): React.ReactElement<React.HTMLAttributes<HTMLAreaElement>> => {
      const textAreaProps = getNativeProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
        props,
        textAreaProperties,
        ['defaultValue'],
      );
      const ariaLabelledBy = props['aria-labelledby'] || (props.label ? labelId : undefined);
      return (
        <textarea
          id={props.id || fallbackId}
          {...textAreaProps}
          ref={textElement as React.Ref<HTMLTextAreaElement>}
          value={getValue(props) || ''}
          onInput={onInputChange}
          onChange={onInputChange}
          className={classNames.field}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={isDescriptionAvailable() ? descriptionId : props['aria-describedby']}
          aria-invalid={!!getErrorMessage()}
          aria-label={props.ariaLabel}
          readOnly={props.readOnly}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      );
    };

    const adjustInputHeight = (): void => {
      if (textElement.current && props.autoAdjustHeight && props.multiline) {
        textElement.current.style.height = '';
        textElement.current.style.height = textElement.current.scrollHeight + 'px';
      }
    };

    const onInputChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      // Previously, we needed to call both onInput and onChange due to some weird IE/React issues,
      // which have *probably* been fixed now:
      // - https://github.com/microsoft/fluentui/issues/744 (likely fixed)
      // - https://github.com/microsoft/fluentui/issues/824 (confirmed fixed)

      // TODO (Fabric 8?) - Switch to calling only onChange. This switch is pretty disruptive for
      // tests (ours and maybe consumers' too), so it seemed best to do the switch in a major bump.

      const element = ev.target as HTMLInputElement;
      const elementValue = element.value;
      // Ignore this event if the value is undefined (in case one of the IE bugs comes back)
      if (elementValue === undefined || elementValue === state.lastChangeValue) {
        return;
      }
      state.lastChangeValue = elementValue;

      // This is so developers can access the event properties in asynchronous callbacks
      // https://reactjs.org/docs/events.html#event-pooling
      ev.persist();

      if (elementValue !== currentValue) {
        setCurrentValue(elementValue, ev);
      }
    };

    const renderInput = (): React.ReactElement<React.HTMLAttributes<HTMLInputElement>> => {
      const inputProps = getNativeProps<React.HTMLAttributes<HTMLInputElement>>(props, inputProperties, [
        'defaultValue',
      ]);
      const ariaLabelledBy = props['aria-labelledby'] || (props.label ? labelId : undefined);
      return (
        <input
          type={'text'}
          id={props.id || fallbackId}
          aria-labelledby={ariaLabelledBy}
          {...inputProps}
          ref={textElement as React.RefObject<HTMLInputElement>}
          value={getValue(props) || ''}
          onInput={onInputChange}
          onChange={onInputChange}
          className={classNames.field}
          aria-label={props.ariaLabel}
          aria-describedby={isDescriptionAvailable() ? descriptionId : props['aria-describedby']}
          aria-invalid={!!getErrorMessage()}
          readOnly={props.readOnly}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      );
    };

    const callWarnControlledUsage = (prevProps?: ITextFieldProps): void => {
      // Show warnings if props are being used in an invalid way
      warnControlledUsage({
        componentId: props.id || fallbackId,
        componentName: COMPONENT_NAME,
        props: props,
        oldProps: prevProps,
        valueProp: 'value',
        defaultValueProp: 'defaultValue',
        onChangeProp: 'onChange',
        readOnlyProp: 'readOnly',
      });
      if (props.value === null && !state.hasWarnedNullValue) {
        state.hasWarnedNullValue = true;
        warn(
          `Warning: 'value' prop on '${COMPONENT_NAME}' should not be null. Consider using an ` +
            'empty string to clear the component or undefined to indicate an uncontrolled component.',
        );
      }
    };

    if (process.env.NODE_ENV !== 'production') {
      warnMutuallyExclusive(COMPONENT_NAME, props, {
        errorMessage: 'onGetErrorMessage',
      });
    }

    callWarnControlledUsage();
    useComponentRef(props, textElement, getValue(props));

    React.useEffect(() => {
      if (shouldValidateAllChanges()) {
        const timeoutId = setTimeout(() => {
          validate(getValue(state.prevProps));
        }, deferredValidationTime);
        state.lastValidation = 0;
        return () => clearTimeout(timeoutId);
      }
    }, [state.prevProps, shouldValidateAllChanges]);

    React.useEffect(() => {
      const { selection = [null, null] } = snapshot || {};
      const [start, end] = selection;

      if (props.multiline && state.prevProps.multiline !== props.multiline && state.prevIsFocused) {
        state.prevProps.multiline = props.multiline;
        state.prevIsFocused = isFocused;
        // The text field has just changed between single- and multi-line, so we need to reset focus
        // and selection/cursor.
        if (textElement.current) {
          textElement.current.focus();
          if (start !== null && end !== null && start >= 0 && end >= 0) {
            (textElement.current as HTMLInputElement).setSelectionRange(start, end);
          }
        }
      }

      const prevValue = getValue(state.prevProps);
      if (prevValue !== currentValue) {
        // Handle controlled/uncontrolled warnings and status
        callWarnControlledUsage(state.prevProps);

        // Clear error message if needed
        // TODO: is there any way to do this without an extra render?
        if (errorMessage && !props.errorMessage) {
          setErrorMessage('');
        }

        // Adjust height if needed based on new value
        adjustInputHeight();

        // Reset the record of the last value seen by a change/input event
        state.lastChangeValue = undefined;

        // TODO: #5875 added logic to trigger validation in componentWillReceiveProps and other places.
        // This seems a bit odd and hard to integrate with the new approach.
        // (Starting to think we should just put the validation logic in a separate wrapper component...?)
      }
    }, [currentValue]);

    React.useEffect(() => {
      adjustInputHeight();
      if (props.validateOnLoad) {
        validate(getValue(props));
      }
    }, [props, currentValue]);

    return (
      <div className={classNames.root} ref={ref}>
        <div className={classNames.wrapper}>
          {onRenderLabel!(props, renderLabel)}
          <div className={classNames.fieldGroup}>
            {(prefix !== undefined || props.onRenderPrefix) && (
              <div className={classNames.prefix}>{onRenderPrefix!(props, renderPrefix)}</div>
            )}
            {multiline ? renderTextArea() : renderInput()}
            {iconProps && <Icon className={classNames.icon} {...iconProps} />}
            {(suffix !== undefined || props.onRenderSuffix) && (
              <div className={classNames.suffix}>{onRenderSuffix!(props, renderSuffix)}</div>
            )}
          </div>
        </div>
        {isDescriptionAvailable && (
          <span id={descriptionId}>
            {onRenderDescription!(props, renderDescription)}
            {getErrorMessage() && (
              <div role="alert">
                <DelayedRender>
                  <p className={classNames.errorMessage}>
                    <span data-automation-id="error-message">{getErrorMessage()}</span>
                  </p>
                </DelayedRender>
              </div>
            )}
          </span>
        )}
      </div>
    );
  },
);
TextFieldBase.displayName = COMPONENT_NAME;
TextFieldBase.defaultProps = {
  resizable: true,
  deferredValidationTime: 200,
  validateOnLoad: true,
};
