import * as React from 'react';
import { getNativeProps, divProperties, initializeComponentRef } from '@uifabric/utilities';
import { useWarnings } from '@uifabric/react-hooks';
import { IPivotItemProps } from './PivotItem.types';

const COMPONENT_NAME = 'PivotItem';

// export const useFloatingSuggestionItems = <T extends {}>(
//   floatingSuggestionItems: T[],
//   focusSuggestionIndex?: number,
//   isSuggestionsVisible?: boolean,
// ) => {

export const PivotItem: React.FunctionComponent = (props: IPivotItemProps) => {
  useDebugWarning(props);
  return <div {...getNativeProps(props, divProperties)}>{props.children}</div>;
};

function useDebugWarning(props: IPivotItemProps) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- build-time conditional
    useWarnings({
      name: COMPONENT_NAME,
      props,
      deprecations: {
        linkText: 'headerText',
      },
    });
  }
}

// export class PivotItem extends React.Component<IPivotItemProps, {}> {
//   constructor(props: IPivotItemProps) {
//     super(props);

//     initializeComponentRef(this);
//     warnDeprecations(COMPONENT_NAME, props, {
//       linkText: 'headerText',
//     });
//   }

//   public render(): JSX.Element {
//     return <div {...getNativeProps(this.props, divProperties)}>{this.props.children}</div>;
//   }
// }
