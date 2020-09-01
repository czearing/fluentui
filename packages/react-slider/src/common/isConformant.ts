// eslint-disable-next-line import/no-extraneous-dependencies -- this file is for testing
import { isConformant as baseIsConformant, IsConformantOptions } from '@fluentui/react-conformance';

export function isConformant(testInfo: IsConformantOptions) {
  const defaultOptions = {
    disabledTests: ['has-docblock', 'kebab-aria-attributes'],
  };

  baseIsConformant(defaultOptions, testInfo);
}
