import { Separator } from './Separator';
import { isConformant } from '../../common/isConformant';

describe('Separator', () => {
  isConformant({
    Component: Separator,
    displayName: 'Separator',
    // Problem: Doesn’t pass ref to root element.
    // Solution: Add a ref to the root element.
    disabledTests: ['component-handles-ref'],
  });
});
