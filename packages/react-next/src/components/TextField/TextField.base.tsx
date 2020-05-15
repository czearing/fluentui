import * as React from 'react';
import { IProcessedStyleSet } from '../../Styling';
import { Label, ILabelStyleProps, ILabelStyles } from '../../Label';
import { Icon } from '../../Icon';
import {
  Async,
  DelayedRender,
  IStyleFunctionOrObject,
  classNamesFunction,
  getId,
  getNativeProps,
  initializeComponentRef,
  inputProperties,
  isControlled,
  textAreaProperties,
  warn,
  warnControlledUsage,
  warnMutuallyExclusive,
} from '../../Utilities';
import { ITextField, ITextFieldProps, ITextFieldStyleProps, ITextFieldStyles } from './TextField.types';
import { useId, useBoolean } from '@uifabric/react-hooks';

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

const DEFAULT_STATE_VALUE = '';
const COMPONENT_NAME = 'TextField';
const onRenderStyles = { paddingBottom: '1px' };

// const useComponentRef = (
//   props: ITextFieldProps,
//   textElement: React.RefObject<ITextField>,
//   value: string | undefined,
//   // start: number,
//   // end: number,
// ) => {
//   React.useImperativeHandle(
//     props.componentRef,
//     () => ({
//       get value() {
//         return value;
//       },
//       focus() {
//         textElement.current ? textElement.current.selectionStart : -1,
//         textElement.current ? textElement.current.selectionEnd : -1,
//         if (textElement.current) {
//           textElement.current.focus();
//           textElement.current.select();
//           textElement.current.blur();
//           textElement.current.selectionStart = value;
//           textElement.current.selectionEnd = value;
//           // (textElement.current as HTMLInputElement).setSelectionRange(start, end);
//         },
//       },
//     }),
//     [value],
//   );
// };

export const TextFieldBase: React.FunctionComponent = (props: ITextFieldProps) => {
  const textElement = React.useRef(null);
  const fallbackId = useId(COMPONENT_NAME);
  const descriptionId = useId(COMPONENT_NAME + 'Description');
  const labelId = useId(COMPONENT_NAME + 'Label');
  let prevState: ITextFieldState;
  const delayedValidate: (value: string | undefined) => void;
  let latestValidateValue: string | undefined = undefined;
  let lastChangeValue: string | undefined = undefined;
  let lastValidation = 0;
  let { defaultValue = DEFAULT_STATE_VALUE } = props;

  if (typeof defaultValue === 'number') {
    // This isn't allowed per the props, but happens anyway.
    defaultValue = String(defaultValue);
  }

  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    isControlled(props, 'value') ? undefined : defaultValue,
  );
  const [isFocused, { toggle: toggleIsFocused }] = useBoolean(false);
  const [errorMessage, setErrorMessage] = React.useState<string | JSX.Element>('');

  const getValue = (): string | undefined => {
    const { value = uncontrolledValue } = props;
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

  /**
   * If `validateOnFocusIn` or `validateOnFocusOut` is true, validation should run **only** on that event.
   * Otherwise, validation should run on every change.
   */

  const shouldValidateAllChanges = (): boolean => {
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

  if (process.env.NODE_ENV !== 'production') {
    warnMutuallyExclusive(COMPONENT_NAME, props, {
      errorMessage: 'onGetErrorMessage',
    });
  }

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

  /**
   * If a custom description render function is supplied then treat description as always available.
   * Otherwise defer to the presence of description or error message text.
   */
  const isDescriptionAvailable = (): boolean => {
    return !!(props.onRenderDescription || props.description || errorMessage || '');
  };

  const renderTextArea = (): React.ReactElement<React.HTMLAttributes<HTMLAreaElement>> => {
    const textAreaProps = getNativeProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>>(props, textAreaProperties, [
      'defaultValue',
    ]);
    const ariaLabelledBy = props['aria-labelledby'] || (props.label ? labelId : undefined);
    return (
      <textarea
        id={props.id || fallbackId}
        {...textAreaProps}
        ref={textElement as React.RefObject<HTMLTextAreaElement>}
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

  const renderInput = (): React.ReactElement<React.HTMLAttributes<HTMLInputElement>> => {
    const inputProps = getNativeProps<React.HTMLAttributes<HTMLInputElement>>(props, inputProperties, ['defaultValue']);
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

  const adjustInputHeight = (): void => {
    if (textElement.current && props.autoAdjustHeight && props.multiline) {
      const textField = textElement.current;
      textField.style.height = '';
      textField.style.height = textField.scrollHeight + 'px';
    }
  };

  const onInputChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    // Previously, we needed to call both onInput and onChange due to some weird IE/React issues,
    // which have *probably* been fixed now:
    // - https://github.com/microsoft/fluentui/issues/744 (likely fixed)
    // - https://github.com/microsoft/fluentui/issues/824 (confirmed fixed)

    // TODO (Fabric 8?) - Switch to calling only onChange. This switch is pretty disruptive for
    // tests (ours and maybe consumers' too), so it seemed best to do the switch in a major bump.

    const element = event.target as HTMLInputElement;
    const value = element.value;
    // Ignore this event if the value is undefined (in case one of the IE bugs comes back)
    if (value === undefined || value === lastChangeValue) {
      return;
    }
    lastChangeValue = value;

    // This is so developers can access the event properties in asynchronous callbacks
    // https://reactjs.org/docs/events.html#event-pooling
    event.persist();
    let isSameValue: boolean;

    () => {
      const prevValue = getValue() || '';
      isSameValue = value === prevValue;
      // Avoid doing unnecessary work when the value has not changed.
      if (isSameValue) {
        return null;
      }

      // ONLY if this is an uncontrolled component, update the displayed value.
      // (Controlled components must update the `value` prop from `onChange`.)
      return isControlled ? null : setUncontrolledValue(value);
    };
    () => {
      // If the value actually changed, call onChange (for either controlled or uncontrolled)
      const { onChange } = props;
      if (!isSameValue && onChange) {
        onChange(event, value);
      }
    };
  };

  // useComponentRef(props, textElement, getValue());
  // warnControlledUsage();

  return (
    <div className={classNames.root}>
      <div className={classNames.wrapper}>
        {onRenderLabel}
        <div className={classNames.fieldGroup}>
          {(prefix !== undefined || props.onRenderPrefix) && <div className={classNames.prefix}>{onRenderPrefix}</div>}
          {multiline ? renderTextArea() : renderInput()}
          {iconProps && <Icon className={classNames.icon} {...iconProps} />}
          {(suffix !== undefined || props.onRenderSuffix) && <div className={classNames.suffix}>{onRenderSuffix}</div>}
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
};
