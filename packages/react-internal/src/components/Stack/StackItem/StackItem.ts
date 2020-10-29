import * as React from 'react';
import { styled } from '../../../Utilities';
import { StackItemBase } from './StackItem.base';
import { IStackItemProps, IStackItemStyles, IStackItemStyleProps } from './StackItem.types';
import { getStyles } from './StackItem.styles';

export const StackItem: React.FunctionComponent<IStackItemProps> = styled<
  IStackItemProps,
  IStackItemStyleProps,
  IStackItemStyles
>(StackItemBase, getStyles, undefined, {
  scope: 'StackItem',
});
