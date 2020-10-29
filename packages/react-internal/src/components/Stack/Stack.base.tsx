import * as React from 'react';
import { createComponent } from '@fluentui/foundation-legacy';
import { StackItem } from './StackItem/StackItem';
import { styles } from './Stack.styles';
import { IStackProps } from './Stack.types';
import { StackView } from './Stack.view';
import { IStackItemProps } from './StackItem/StackItem.types';

const StackStatics = {
  Item: StackItem,
};

export const StackBase: React.FunctionComponent<IStackProps> = React.forwardRef<HTMLElement, IStackProps>(
  (props, forwardedRef) => {
    return <StackView statics={StackStatics} ref={forwardedRef} />;
  },
);
StackBase.displayName = 'Stack';

// export const Stack: React.FunctionComponent<IStackProps> & {
//   Item: React.FunctionComponent<IStackItemProps>;
// } = createComponent(StackView, {
//   displayName: 'Stack',
//   styles,
//   statics: StackStatics,
// });

// export default Stack;
