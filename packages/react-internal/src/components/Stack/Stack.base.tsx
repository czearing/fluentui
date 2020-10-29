import * as React from 'react';
import { getNativeProps, htmlElementProperties } from '../../Utilities';
import { classNamesFunction } from '../../Utilities';
import { IStackStyles, IStackProps, IStackStyleProps } from './Stack.types';
import { StackItem } from './StackItem/StackItem';
import { IStackItemProps } from './StackItem/StackItem.types';
import { useWarnings } from '@uifabric/react-hooks';

const getClassNames = classNamesFunction<IStackStyleProps, IStackStyles>();

export const StackBase: React.FunctionComponent<IStackProps> = React.forwardRef<HTMLDivElement, IStackProps>(
  (props, forwardRef) => {
    const {
      disableShrink,
      wrap,
      verticalFill,
      horizontal,
      reversed,
      grow,
      // eslint-disable-next-line deprecation/deprecation
      gap,
      horizontalAlign,
      verticalAlign,
      styles,
      theme,
      ...rest
    } = props;

    const nativeProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(rest, htmlElementProperties);
    const stylesProps: IStackStyleProps = {
      theme: theme!,
      verticalFill,
      horizontal,
      reversed,
      grow,
      gap,
      wrap,
      horizontalAlign,
      verticalAlign,
      disableShrink,
    };

    const classNames = getClassNames(styles, stylesProps);

    const stackChildren: (React.ReactChild | null)[] | null | undefined = React.Children.map(
      props.children,
      (child: React.ReactElement<IStackItemProps>, index: number) => {
        if (!child) {
          return null;
        }
        if (_isStackItem(child)) {
          const defaultItemProps: IStackItemProps = {
            shrink: !disableShrink,
          };
          return React.cloneElement(child, {
            ...defaultItemProps,
            ...child.props,
          });
        }
        return child;
      },
    );

    useDebugWarning(props);

    return (
      (wrap && (
        <div {...nativeProps} className={classNames.root}>
          <div>{stackChildren}</div>
        </div>
      )) || (
        <div {...nativeProps} className={classNames.root} ref={forwardRef}>
          {stackChildren}
        </div>
      )
    );
  },
);
StackBase.displayName = 'Stack';

function _isStackItem(item: React.ReactNode): item is typeof StackItem {
  // In theory, we should be able to just check item.type === StackItem.
  // However, under certain unclear circumstances (see https://github.com/microsoft/fluentui/issues/10785),
  // the object identity is different despite the function implementation being the same.
  return (
    !!item &&
    typeof item === 'object' &&
    !!(item as React.ReactElement).type &&
    // StackItem is generated by createComponent, so we need to check its displayName instead of name
    ((item as React.ReactElement).type as React.ComponentType).displayName === StackItem.displayName
  );
}

function useDebugWarning(props: IStackProps) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- build-time conditional
    useWarnings({
      name: 'StackView',
      props,
      deprecations: {
        gap: 'tokens.childrenGap',
        maxHeight: 'tokens.maxHeight',
        maxWidth: 'tokens.maxWidth',
        padding: 'tokens.padding',
      },
    });
  }
}