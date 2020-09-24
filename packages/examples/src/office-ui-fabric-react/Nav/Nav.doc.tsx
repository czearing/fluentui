import * as React from 'react';
import { NavBasicExample } from './Nav.Basic.Example';
import { IDocPageProps } from 'office-ui-fabric-react/lib/common/DocPage.types';
import { NavFabricDemoAppExample } from './Nav.FabricDemoApp.Example';
import { NavNestedExample } from './Nav.Nested.Example';
import { NavCustomGroupHeadersExample } from './Nav.CustomGroupHeaders.Example';

const NavBasicExampleCode = require('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/Nav.Basic.Example.tsx') as string;
const NavFabricDemoAppExampleCode = require('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/Nav.FabricDemoApp.Example.tsx') as string;
const NavNestedExampleCode = require('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/Nav.Nested.Example.tsx') as string;
const NavCustomGroupHeadersExampleCode = require('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/Nav.CustomGroupHeaders.Example.tsx') as string;

export const NavPageProps: IDocPageProps = {
  title: 'Nav',
  componentName: 'Nav',
  componentUrl: 'https://github.com/microsoft/fluentui/tree/master/packages/office-ui-fabric-react/src/components/Nav',
  examples: [
    {
      title: 'Basic nav with sample links',
      code: NavBasicExampleCode,
      view: <NavBasicExample />,
    },
    {
      title: 'Nav similar to the one in this demo app',
      code: NavFabricDemoAppExampleCode,
      view: <NavFabricDemoAppExample />,
    },
    {
      title: 'Nav with nested links',
      code: NavNestedExampleCode,
      view: <NavNestedExample />,
    },
    {
      title: 'Nav with custom group header',
      code: NavCustomGroupHeadersExampleCode,
      view: <NavCustomGroupHeadersExample />,
    },
  ],
  propertiesTablesSources: [require<string>('!raw-loader!office-ui-fabric-react/src/components/Nav/Nav.types.ts')],
  overview: require<string>('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/docs/NavOverview.md'),
  bestPractices: require<
    string
  >('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/docs/NavBestPractices.md'),
  dos: require<string>('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/docs/NavDos.md'),
  donts: require<string>('!raw-loader!@fluentui/examples/src/office-ui-fabric-react/Nav/docs/NavDonts.md'),
  isHeaderVisible: true,
  isFeedbackVisible: true,
};
