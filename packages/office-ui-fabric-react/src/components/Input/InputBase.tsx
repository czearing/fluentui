import * as React from 'react';
import { compose } from '@fluentui/react-compose';

export type InputProps {

};

export const Input = compose(
  (props, ref, options) => {
    return <input />;
  },
  {
    displayName: 'Input',
  },
);
