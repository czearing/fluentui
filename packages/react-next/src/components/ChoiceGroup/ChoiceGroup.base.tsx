import * as React from 'react';
import { Label } from '../../Label';
import {
  warnDeprecations,
  warnMutuallyExclusive,
  classNamesFunction,
  find,
  isControlled,
  getNativeProps,
  divProperties,
} from '../../Utilities';
import {
  IChoiceGroup,
  IChoiceGroupOption,
  IChoiceGroupProps,
  IChoiceGroupStyleProps,
  IChoiceGroupStyles,
} from './ChoiceGroup.types';
import { ChoiceGroupOption, IChoiceGroupOptionProps } from './ChoiceGroupOption/index';
import { useConst, useId, useConstCallback } from '@uifabric/react-hooks';

const getClassNames = classNamesFunction<IChoiceGroupStyleProps, IChoiceGroupStyles>();

const useComponentRef = (props: IChoiceGroupProps, elementToFocus: HTMLElement | null, componentRef) => {
  React.useImperativeHandle(
    props.componentRef,
    () => ({
      get checkedOption() {
        return find(options, (value: IChoiceGroupOption) => value.key === keyChecked);
      },
      focus() {
        const optionToFocus = checkedOption || options.filter(option => !option.disabled)[0];
        const elementToFocus = optionToFocus && document.getElementById(getOptionId(optionToFocus));
        if (elementToFocus) {
          elementToFocus.focus();
        }
      },
    }),
    [],
  );
};

export const ChoiceGroupBase: React.FunctionComponent = (props: IChoiceGroupProps) => {
  const { className, theme, styles, options = [], label, required, disabled, name, defaultSelectedKey } = props;
  const id = useId('ChoiceGroup');
  const labelId = id + '-label';
  const focusCallbacks: { [key: string]: IChoiceGroupOptionProps['onFocus'] } = {};
  const changeCallbacks: { [key: string]: IChoiceGroupOptionProps['onBlur'] } = {};

  const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties, [
    'onChange',
    'className',
    'required',
  ]);

  const classNames = getClassNames(styles!, {
    theme: theme!,
    className,
    optionsContainIconOrImage: options.some(option => !!(option.iconProps || option.imageSrc)),
  });

  const ariaLabelledBy = props.ariaLabelledBy || (label ? labelId : props['aria-labelledby']);

  // React.useImperativeHandle(
  //   () => ({
  //     checkedOption() {
  //       return find(options, (value: IChoiceGroupOption) => value.key === keyChecked);
  //     },

  //     focus() {
  //       if (elementToFocus) {
  //         elementToFocus.focus();
  //       }
  //     },
  //   }),
  //   [],
  // );

  /**
   * Returns `selectedKey` if provided, or the key of the first option with the `checked` prop set.
   */
  const getKeyChecked = (): string | number | undefined => {
    if (props.selectedKey !== undefined) {
      return props.selectedKey;
    }
    // eslint-disable-next-line deprecation/deprecation
    const optionsChecked = options.filter((option: IChoiceGroupOption) => option.checked);
    return optionsChecked[0] && optionsChecked[0].key;
  };

  const validDefaultSelectedKey =
    !_isControlled(props) &&
    defaultSelectedKey !== undefined &&
    options.some(option => option.key === defaultSelectedKey);

  const [keyChecked, setKeyChecked] = React.useState(validDefaultSelectedKey ? defaultSelectedKey : getKeyChecked());
  const [keyFocused, setKeyFocused] = React.useState<string | number>();

  const getOptionId = (option: IChoiceGroupOption): string => {
    return `${id}-${option.key}`;
  };

  const onFocus = (key: string) => {
    // This extra mess is necessary because React won't pass the `key` prop through to ChoiceGroupOption
    if (!focusCallbacks[key]) {
      focusCallbacks[key] = (ev: React.FocusEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption) => {
        setKeyFocused(key);
      };
    }
    return focusCallbacks[key];
  };

  const onBlur = useConstCallback((ev: React.FocusEvent<HTMLElement>, option: IChoiceGroupOption) => {
    setKeyFocused(undefined);
  });

  const choiceGroupOnChange = (key: string) => {
    // This extra mess is necessary because React won't pass the `key` prop through to ChoiceGroupOption
    if (!changeCallbacks[key]) {
      changeCallbacks[key] = (evt: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption) => {
        // eslint-disable-next-line deprecation/deprecation
        const { onChanged, onChange } = props;

        // Only manage state in uncontrolled scenarios.
        if (!_isControlled(props)) {
          setKeyChecked(key);
        }

        // Get the original option without the `key` prop removed
        const originalOption = find(props.options || [], (value: IChoiceGroupOption) => value.key === key);

        // TODO: onChanged deprecated, remove else if after 07/17/2017 when onChanged has been removed.
        if (onChange) {
          onChange(evt, originalOption);
        } else if (onChanged) {
          onChanged(originalOption!, evt);
        }
      };
    }
    return changeCallbacks[key];
  };

  if (process.env.NODE_ENV !== 'production') {
    warnDeprecations('ChoiceGroup', props, { onChanged: 'onChange' });
    warnMutuallyExclusive('ChoiceGroup', props, {
      selectedKey: 'defaultSelectedKey',
    });
  }

  const optionToFocus =
    find(options, (value: IChoiceGroupOption) => value.key === keyChecked) ||
    options.filter(option => !option.disabled)[0];

  const elementToFocus = optionToFocus && document.getElementById(getOptionId(optionToFocus));

  useComponentRef(elementToFocus);
  // TODO (Fabric 8?) - if possible, move `root` class to the actual root and eliminate
  // `applicationRole` class (but the div structure will stay the same by necessity)
  return (
    // eslint-disable-next-line deprecation/deprecation
    <div className={classNames.applicationRole} {...divProps}>
      <div className={classNames.root} role="radiogroup" {...(ariaLabelledBy && { 'aria-labelledby': ariaLabelledBy })}>
        {label && (
          <Label className={classNames.label} required={required} id={labelId} disabled={disabled}>
            {label}
          </Label>
        )}
        <div className={classNames.flexContainer}>
          {options.map((option: IChoiceGroupOption) => {
            const innerOptionProps = {
              ...option,
              focused: option.key === keyFocused,
              checked: option.key === keyChecked,
              disabled: option.disabled || disabled,
              id: getOptionId(option),
              labelId: `${labelId}-${option.key}`,
              name: name || id,
              required,
            };

            return (
              <ChoiceGroupOption
                key={option.key}
                onBlur={onBlur}
                onFocus={onFocus(option.key)}
                onChange={choiceGroupOnChange(option.key)}
                {...innerOptionProps}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

function _isControlled(props: IChoiceGroupProps): boolean {
  return isControlled(props, 'selectedKey');
}
