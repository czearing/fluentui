import * as React from 'react';
import { StackBase } from './Stack.base';
import { StackItem } from './StackItem/StackItem';
import { getStyles } from './Stack.styles';
import { IStackProps, IStackStyleProps, IStackStyles } from './Stack.types';
import { styled } from '@uifabric/utilities';

export type StackStatics = {
  Item: typeof StackItem;
};

export const Stack: React.FunctionComponent<IStackProps> & StackStatics = styled<
  IStackProps,
  IStackStyleProps,
  IStackStyles
>(StackBase, getStyles, undefined, {
  scope: 'Stack',
}) as any;
Stack.Item = StackItem;
