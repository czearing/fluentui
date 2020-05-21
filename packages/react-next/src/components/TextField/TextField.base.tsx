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
import { ITextField, ITextFieldProps, ITextFieldStyleProps, ITextFieldStyles } from './TextField.types';
import { useId, useBoolean, useControllableValue } from '@uifabric/react-hooks';

const getClassNames = classNamesFunction<ITextFieldStyleProps, ITextFieldStyles>();

/** @internal */
export interface ITextFieldState {
  /** The currently displayed value if uncontrolled. */
  uncontrolledValue: string | undefined;

  /** Is true when the control has focus. */
  isFocused?: boolean;

  /**
   * Dynamic error message returned by `onGetErrorMessage`.
   * Use `this._errorMessage` to get the actual current error message.
   */
  errorMessage: string | JSX.Element;
}

/** @internal */
export interface ITextFieldSnapshot {
  /**
   * If set, the text field is changing between single- and multi-line, so we'll need to reset
   * selection/cursor after the change completes.
   */
  selection?: [number | null, number | null];
}

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

const DEFAULT_STATE_VALUE = '';
const COMPONENT_NAME = 'TextField';
const onRenderStyles = { paddingBottom: '1px' };

export const TextFieldBase: React.FunctionComponent = React.forwardRef(
  (props: ITextFieldProps, ref: React.Ref<HTMLDivElement>) => {
    const textElement = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const fallbackId = useId(COMPONENT_NAME);
    const descriptionId = useId(COMPONENT_NAME + 'Description');
    const labelId = useId(COMPONENT_NAME + 'Label');
    let latestValidateValue: string | undefined = undefined;
    let lastChangeValue: string | undefined = undefined;
    let hasWarnedNullValue: boolean | undefined = undefined;
    let lastValidation = 0;
    let { defaultValue = DEFAULT_STATE_VALUE } = props;
    if (typeof defaultValue === 'number') {
      // This isn't allowed per the props, but happens anyway.
      defaultValue = String(defaultValue);
    }
    props.checked, props.defaultChecked, props.onChange;
    const [value, setValue] = useControllableValue(props.value, props.defaultValue, props.onChange);
    const [isFocused, { toggle: toggleIsFocused }] = useBoolean(false);
    const [errorMessage, setErrorMessage] = React.useState<string | JSX.Element>('');

    const getValue = (): string | undefined => {
      if (typeof value === 'number') {
        // not allowed per typings, but happens anyway
        return String(value);
      }
      return value;
    };

    const renderLabel = (): JSX.Element | null => {
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
            disabled={props.disabled}
            id={labelId}
          >
            {props.label}
          </Label>
        );
      }
      return null;
    };

    const renderDescription = (): JSX.Element | null => {
      if (props.description) {
        return <span className={classNames.description}>{props.description}</span>;
      }
      return null;
    };

    const renderPrefix = (): JSX.Element => {
      return <span style={onRenderStyles}>{prefix}</span>;
    };

    const renderSuffix = (): JSX.Element => {
      return <span style={onRenderStyles}>{suffix}</span>;
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
      validateOnLoad = true,
      onRenderPrefix = renderPrefix,
      onRenderSuffix = renderSuffix,
      onRenderLabel = renderLabel,
      onRenderDescription = renderDescription,
    } = props;

    const classNames = getClassNames(styles!, {
      theme: theme!,
      className,
      disabled,
      focused: isFocused,
      required,
      multiline,
      hasLabel: !!label,
      hasErrorMessage: !!errorMessage,
      borderless,
      resizable,
      hasIcon: !!iconProps,
      underlined,
      inputClassName,
      autoAdjustHeight,
    });

    const validate = (): void => {
      // In case _validate is called again while validation promise is executing
      if (latestValidateValue === getValue() && shouldValidateAllChanges()) {
        return;
      }
      latestValidateValue = getValue();
      const onGetErrorMessage = props.onGetErrorMessage;
      const result = onGetErrorMessage && onGetErrorMessage(getValue() || '');
      if (result !== undefined) {
        if (typeof result === 'string' || !('then' in result)) {
          setErrorMessage(result);
          notifyAfterValidate(result);
        } else {
          const currentValidation: number = ++lastValidation;
          result.then((errorMessageValue: string | JSX.Element) => {
            if (currentValidation === lastValidation) {
              setErrorMessage(errorMessageValue);
            }
            notifyAfterValidate(errorMessage);
          });
        }
      } else {
        notifyAfterValidate('');
      }
    };

    const notifyAfterValidate = (errorMessageProp: string | JSX.Element): void => {
      if (getValue() && props.onNotifyValidationResult) {
        props.onNotifyValidationResult(errorMessageProp, getValue());
      }
    };

    const onFocus = (ev: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (props.onFocus) {
        props.onFocus(ev);
      }
      toggleIsFocused();
      if (props.validateOnFocusIn) {
        validate();
      }
    };

    const onBlur = (ev: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (props.onBlur) {
        props.onBlur(ev);
      }
      toggleIsFocused();
      if (props.validateOnFocusOut) {
        validate();
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
          value={getValue() || ''}
          onInput={onInputChange}
          onChange={onInputChange}
          className={classNames.field}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={isDescriptionAvailable ? descriptionId : props['aria-describedby']}
          aria-invalid={!!errorMessage}
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
      if (elementValue === undefined || elementValue === lastChangeValue) {
        return;
      }
      lastChangeValue = elementValue;

      // This is so developers can access the event properties in asynchronous callbacks
      // https://reactjs.org/docs/events.html#event-pooling
      ev.persist();

      if (elementValue !== value) {
        setValue(elementValue, ev);
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
          value={getValue() || ''}
          onInput={onInputChange}
          onChange={onInputChange}
          className={classNames.field}
          aria-label={props.ariaLabel}
          aria-describedby={isDescriptionAvailable ? descriptionId : props['aria-describedby']}
          aria-invalid={!!errorMessage}
          readOnly={props.readOnly}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      );
    };

    const useWarnControlledUsage = (): void => {
      // Show warnings if props are being used in an invalid way
      warnControlledUsage({
        componentId: props.id || fallbackId,
        componentName: COMPONENT_NAME,
        props: props,
        oldProps: props,
        valueProp: 'value',
        defaultValueProp: 'defaultValue',
        onChangeProp: 'onChange',
        readOnlyProp: 'readOnly',
      });
      if (props.value === null && !hasWarnedNullValue) {
        hasWarnedNullValue = true;
        warn(
          `Warning: 'value' prop on '${COMPONENT_NAME}' should not be null. Consider using an ` +
            'empty string to clear the component or undefined to indicate an uncontrolled component.',
        );
      }
    };

    useWarnControlledUsage();
    if (process.env.NODE_ENV !== 'production') {
      warnMutuallyExclusive(COMPONENT_NAME, props, {
        errorMessage: 'onGetErrorMessage',
      });
    }

    useComponentRef(props, textElement, getValue());

    return (
      <div className={classNames.root} ref={ref}>
        <div className={classNames.wrapper}>
          {onRenderLabel}
          <div className={classNames.fieldGroup}>
            {(prefix !== undefined || props.onRenderPrefix) && (
              <div className={classNames.prefix}>{onRenderPrefix}</div>
            )}
            {multiline ? renderTextArea() : renderInput()}
            {iconProps && <Icon className={classNames.icon} {...iconProps} />}
            {(suffix !== undefined || props.onRenderSuffix) && (
              <div className={classNames.suffix}>{onRenderSuffix}</div>
            )}
          </div>
        </div>
        {isDescriptionAvailable && (
          <span id={descriptionId}>
            {onRenderDescription}
            {errorMessage ||
              ('' && (
                <div role="alert">
                  <DelayedRender>
                    <p className={classNames.errorMessage || ''}>
                      <span data-automation-id="error-message">{errorMessage || ''}</span>
                    </p>
                  </DelayedRender>
                </div>
              ))}
          </span>
        )}
      </div>
    );
  },
);
TextFieldBase.displayName = COMPONENT_NAME;
