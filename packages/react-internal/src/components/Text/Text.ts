import * as React from 'react';
import { styled } from '../../Utilities';
import { ITextProps, ITextStyles, ITextStyleProps } from './Text.types';
import { TextBase } from './Text.base';
import { getStyles } from './Text.styles';

export const Text: React.FunctionComponent<ITextProps> = styled<ITextProps, ITextStyleProps, ITextStyles>(
  TextBase,
  getStyles,
  undefined,
  {
    scope: 'Text',
  },
);
