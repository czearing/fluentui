import { isConformant as baseIsConformant, IsConformantOptions } from '@fluentui/react-conformance';

export function isConformant(testInfo: Omit<IsConformantOptions, 'componentPath' | 'packageVersion'>) {
  const defaultOptions = {
    disabledTests: ['has-docblock', 'kebab-aria-attributes'],
    componentPath: module!.parent!.filename.replace('.test', ''),
    packageVersion: '@fluentui/react-tabs',
  };

  baseIsConformant(defaultOptions, testInfo);
}
