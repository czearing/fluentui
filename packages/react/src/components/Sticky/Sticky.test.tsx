import * as React from 'react';
import { Sticky } from './Sticky';
import { safeCreate, safeMount } from '@fluentui/test-utilities';
import { resetIds } from '@fluentui/utilities';
import { isConformant } from '../../common/isConformant';

const ReactDOM = require('react-dom');

describe('Sticky', () => {
  const createPortal = ReactDOM.createPortal;

  beforeEach(() => {
    resetIds();
  });

  afterEach(() => {
    ReactDOM.createPortal = createPortal;
  });

  // Conformance Tests:
  isConformant({
    Component: Sticky,
    displayName: 'Sticky',
    // Problem: Ref doesn't match DOM node and returns outermost div.
    // Solution: Ensure ref is passed correctly to the root element.
    disabledTests: ['component-handles-ref', 'component-has-root-ref', 'component-handles-classname'],
  });

  // Snapshot Tests:
  it('renders Sticky (correctly)', () => {
    ReactDOM.createPortal = jest.fn(element => element);

    safeCreate(<Sticky>This is a test</Sticky>, component => {
      const tree = component!.toJSON();
      expect(tree).toMatchSnapshot();
    });
  });
});
