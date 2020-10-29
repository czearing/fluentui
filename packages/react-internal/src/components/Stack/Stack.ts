import * as React from 'react';
import { StackBase } from './Stack.base';
import { getStyles } from './Stack.styles';
import { IStackProps, IStackStyleProps, IStackStyles } from './Stack.types';
import { styled } from '@uifabric/utilities';

export const Stack: React.FunctionComponent<IStackProps> = styled<IStackProps, IStackStyleProps, IStackStyles>(
  StackBase,
  getStyles,
  undefined,
  {
    scope: 'Stack',
  },
);
