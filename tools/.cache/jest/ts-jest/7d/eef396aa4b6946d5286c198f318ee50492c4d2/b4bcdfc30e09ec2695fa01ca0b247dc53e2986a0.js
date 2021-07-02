'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function(resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, '__esModule', { value: true });
const testing_1 = require('@nrwl/devkit/testing');
const devkit_1 = require('@nrwl/devkit');
const workspace_1 = require('@nrwl/workspace');
const index_1 = require('./index');
describe('migrate-converged-pkg generator', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {};
  let tree;
  const options = { name: '@proj/react-dummy' };
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, 'log').mockImplementation(noop);
    jest.spyOn(console, 'info').mockImplementation(noop);
    jest.spyOn(console, 'warn').mockImplementation(noop);
    tree = testing_1.createTreeWithEmptyWorkspace();
    tree.write(
      'jest.config.js',
      devkit_1.stripIndents`
      module.exports = {
          projects: []
      }`,
    );
    tree = setupDummyPackage(tree, options);
    tree = setupDummyPackage(tree, {
      name: '@proj/react-examples',
      version: '8.0.0',
      dependencies: {
        [options.name]: '9.0.40-alpha1',
        '@proj/old-v8-foo': '8.0.40',
        '@proj/old-v8-bar': '8.0.41',
      },
    });
  });
  describe('general', () => {
    it(`should throw error if name is empty`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        yield expect(index_1.default(tree, { name: '' })).rejects.toMatchInlineSnapshot(
          `[Error: --name cannot be empty. Please provide name of the package.]`,
        );
      }));
    it(`should throw error if provided name doesn't match existing package`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        yield expect(index_1.default(tree, { name: '@proj/non-existent-lib' })).rejects.toMatchInlineSnapshot(
          `[Error: Cannot find configuration for '@proj/non-existent-lib' in /workspace.json.]`,
        );
      }));
    it(`should throw error if user wants migrate non converged package`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        devkit_1.updateJson(tree, `${projectConfig.root}/package.json`, json => {
          json.version = '8.0.0';
          return json;
        });
        yield expect(index_1.default(tree, options)).rejects.toMatchInlineSnapshot(
          // eslint-disable-next-line @fluentui/max-len
          `[Error: @proj/react-dummy is not converged package. Make sure to run the migration on packages with version 9.x.x]`,
        );
      }));
  });
  describe(`tsconfig updates`, () => {
    function getTsConfig(project) {
      return devkit_1.readJson(tree, `${project.root}/tsconfig.json`);
    }
    function getBaseTsConfig() {
      return devkit_1.readJson(tree, `/tsconfig.base.json`);
    }
    it('should update package local tsconfig.json', () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        let tsConfig = getTsConfig(projectConfig);
        expect(tsConfig).toEqual({
          compilerOptions: {
            baseUrl: '.',
            typeRoots: ['../../node_modules/@types', '../../typings'],
          },
        });
        yield index_1.default(tree, options);
        tsConfig = getTsConfig(projectConfig);
        expect(tsConfig).toEqual({
          compilerOptions: {
            declaration: true,
            experimentalDecorators: true,
            importHelpers: true,
            jsx: 'react',
            lib: ['es5', 'dom'],
            module: 'CommonJS',
            noUnusedLocals: true,
            outDir: 'dist',
            preserveConstEnums: true,
            target: 'ES5',
            types: ['jest', 'custom-global', 'inline-style-expand-shorthand'],
          },
          extends: '../../tsconfig.base.json',
          include: ['src'],
        });
      }));
    it('should update compilerOptions.types definition for local tsconfig.json', () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        devkit_1.updateJson(tree, `${projectConfig.root}/tsconfig.json`, json => {
          json.compilerOptions.types = ['jest', '@testing-library/jest-dom', 'foo-bar'];
          return json;
        });
        yield index_1.default(tree, options);
        const tsConfig = getTsConfig(projectConfig);
        expect(tsConfig.compilerOptions.types).toEqual([
          'jest',
          'custom-global',
          'inline-style-expand-shorthand',
          '@testing-library/jest-dom',
          'foo-bar',
        ]);
      }));
    // eslint-disable-next-line @fluentui/max-len
    it('should update root tsconfig.base.json with migrated package alias including all missing aliases based on packages dependencies list', () =>
      __awaiter(void 0, void 0, void 0, function*() {
        setupDummyPackage(tree, { name: '@proj/react-make-styles', dependencies: {} });
        setupDummyPackage(tree, { name: '@proj/react-theme', dependencies: {} });
        setupDummyPackage(tree, { name: '@proj/react-utilities', dependencies: {} });
        let rootTsConfig = getBaseTsConfig();
        expect(rootTsConfig).toEqual({
          compilerOptions: {
            paths: {},
          },
        });
        yield index_1.default(tree, options);
        rootTsConfig = getBaseTsConfig();
        expect(rootTsConfig.compilerOptions.paths).toEqual(
          expect.objectContaining({
            '@proj/react-dummy': ['packages/react-dummy/src/index.ts'],
            '@proj/react-make-styles': ['packages/react-make-styles/src/index.ts'],
            '@proj/react-theme': ['packages/react-theme/src/index.ts'],
            '@proj/react-utilities': ['packages/react-utilities/src/index.ts'],
          }),
        );
        expect(Object.keys(rootTsConfig.compilerOptions.paths)).not.toContain(['tslib', 'someThirdPartyDep']);
      }));
  });
  describe(`jest config updates`, () => {
    it(`should setup new local jest config which extends from root `, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        function getJestConfig() {
          var _a;
          return (_a = tree.read(`${projectConfig.root}/jest.config.js`)) === null || _a === void 0
            ? void 0
            : _a.toString('utf-8');
        }
        let jestConfig = getJestConfig();
        expect(jestConfig).toMatchInlineSnapshot(`
        "const { createConfig } = require('@fluentui/scripts/jest/jest-resources');
        const path = require('path');

        const config = createConfig({
        setupFiles: [path.resolve(path.join(__dirname, 'config', 'tests.js'))],
        snapshotSerializers: ['@fluentui/jest-serializer-make-styles'],
        });

        module.exports = config;"
      `);
        yield index_1.default(tree, options);
        jestConfig = getJestConfig();
        expect(jestConfig).toMatchInlineSnapshot(`
        "// @ts-check

        /**
        * @type {jest.InitialOptions}
        */
        module.exports = {
        displayName: 'react-dummy',
        preset: '../../jest.preset.js',
        globals: {
        'ts-jest': {
        tsConfig: '<rootDir>/tsconfig.json',
        diagnostics: false,
        },
        },
        transform: {
        '^.+\\\\\\\\.tsx?$': 'ts-jest',
        },
        coverageDirectory: './coverage',
        setupFilesAfterEnv: ['./config/tests.js'],
        snapshotSerializers: ['@fluentui/jest-serializer-make-styles'],
        };"
      `);
      }));
    it(`should add project to root jest.config.js`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        function getJestConfig() {
          var _a;
          return (_a = tree.read(`/jest.config.js`)) === null || _a === void 0 ? void 0 : _a.toString('utf-8');
        }
        let jestConfig = getJestConfig();
        expect(jestConfig).toMatchInlineSnapshot(`
        "module.exports = {
        projects: []
        }"
      `);
        yield index_1.default(tree, options);
        jestConfig = getJestConfig();
        expect(jestConfig).toMatchInlineSnapshot(`
        "module.exports = {
        projects: [\\"<rootDir>/packages/react-dummy\\"]
        }"
      `);
      }));
  });
  describe(`storybook updates`, () => {
    it(`should setup local storybook`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        var _a, _b;
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        const projectStorybookConfigPath = `${projectConfig.root}/.storybook`;
        expect(tree.exists(projectStorybookConfigPath)).toBeFalsy();
        yield index_1.default(tree, options);
        expect(tree.exists(projectStorybookConfigPath)).toBeTruthy();
        expect(devkit_1.readJson(tree, `${projectStorybookConfigPath}/tsconfig.json`)).toMatchInlineSnapshot(`
        Object {
          "compilerOptions": Object {
            "allowJs": true,
            "checkJs": true,
          },
          "exclude": Array [
            "../**/*.test.ts",
            "../**/*.test.js",
            "../**/*.test.tsx",
            "../**/*.test.jsx",
          ],
          "extends": "../tsconfig.json",
          "include": Array [
            "../src/**/*",
            "*.js",
          ],
        }
      `);
        /* eslint-disable @fluentui/max-len */
        expect(
          (_a = tree.read(`${projectStorybookConfigPath}/main.js`)) === null || _a === void 0
            ? void 0
            : _a.toString('utf-8'),
        ).toMatchInlineSnapshot(`
        "const rootMain = require('../../../.storybook/main');

        module.exports = /** @type {Pick<import('../../../.storybook/main').StorybookConfig,'addons'|'stories'|'webpackFinal'>} */ ({
        stories: [...rootMain.stories, '../src/**/*.stories.mdx', '../src/**/*.stories.@(ts|tsx)'],
        addons: [...rootMain.addons],
        webpackFinal: (config, options) => {
        const localConfig = { ...rootMain.webpackFinal(config, options) };

        return localConfig;
        },
        });"
      `);
        /* eslint-enable @fluentui/max-len */
        expect(
          (_b = tree.read(`${projectStorybookConfigPath}/preview.js`)) === null || _b === void 0
            ? void 0
            : _b.toString('utf-8'),
        ).toMatchInlineSnapshot(`
        "import * as rootPreview from '../../../.storybook/preview';

        export const decorators = [...rootPreview.decorators];"
      `);
      }));
    function setup() {
      const workspaceConfig = devkit_1.readWorkspaceConfiguration(tree);
      const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
      const normalizedProjectName = options.name.replace(`@${workspaceConfig.npmScope}/`, '');
      const reactExamplesConfig = devkit_1.readProjectConfiguration(tree, '@proj/react-examples');
      const pathToStoriesWithinReactExamples = `${reactExamplesConfig.root}/src/${normalizedProjectName}`;
      const paths = {
        reactExamples: {
          // eslint-disable-next-line @fluentui/max-len
          //  options.name==='@proj/react-dummy' -> react-examples/src/react-dummy/ReactDummyOther/ReactDummy.stories.tsx
          storyFileOne: `${pathToStoriesWithinReactExamples}/${workspace_1.stringUtils.classify(
            normalizedProjectName,
          )}/${workspace_1.stringUtils.classify(normalizedProjectName)}.stories.tsx`,
          // eslint-disable-next-line @fluentui/max-len
          // if options.name==='@proj/react-dummy' -> react-examples/src/react-dummy/ReactDummyOther/ReactDummyOther.stories.tsx
          storyFileTwo: `${pathToStoriesWithinReactExamples}/${workspace_1.stringUtils.classify(
            normalizedProjectName,
          )}Other/${workspace_1.stringUtils.classify(normalizedProjectName)}Other.stories.tsx`,
        },
      };
      tree.write(
        paths.reactExamples.storyFileOne,
        devkit_1.stripIndents`
         import * as Implementation from '${options.name}';
         export const Foo = (props: FooProps) => { return <div>Foo</div>; }
        `,
      );
      tree.write(
        paths.reactExamples.storyFileTwo,
        devkit_1.stripIndents`
         import * as Implementation from '${options.name}';
         export const FooOther = (props: FooPropsOther) => { return <div>FooOther</div>; }
        `,
      );
      function getMovedStoriesData() {
        var _a, _b;
        const movedStoriesExportNames = {
          storyOne: `${workspace_1.stringUtils.classify(normalizedProjectName)}`,
          storyTwo: `${workspace_1.stringUtils.classify(normalizedProjectName)}Other`,
        };
        const movedStoriesFileNames = {
          storyOne: `${movedStoriesExportNames.storyOne}.stories.tsx`,
          storyTwo: `${movedStoriesExportNames.storyTwo}.stories.tsx`,
        };
        const movedStoriesPaths = {
          storyOne: `${projectConfig.root}/src/${movedStoriesFileNames.storyOne}`,
          storyTwo: `${projectConfig.root}/src/${movedStoriesFileNames.storyTwo}`,
        };
        const movedStoriesContent = {
          storyOne:
            (_a = tree.read(movedStoriesPaths.storyOne)) === null || _a === void 0 ? void 0 : _a.toString('utf-8'),
          storyTwo:
            (_b = tree.read(movedStoriesPaths.storyTwo)) === null || _b === void 0 ? void 0 : _b.toString('utf-8'),
        };
        return { movedStoriesPaths, movedStoriesExportNames, movedStoriesFileNames, movedStoriesContent };
      }
      return {
        projectConfig,
        reactExamplesConfig,
        workspaceConfig,
        normalizedProjectName,
        pathToStoriesWithinReactExamples,
        getMovedStoriesData,
      };
    }
    it(`should work if there are no package stories in react-examples`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const reactExamplesConfig = devkit_1.readProjectConfiguration(tree, '@proj/react-examples');
        const workspaceConfig = devkit_1.readWorkspaceConfiguration(tree);
        expect(
          tree.exists(`${reactExamplesConfig.root}/src/${options.name.replace(`@${workspaceConfig.npmScope}/`, '')}`),
        ).toBe(false);
        const loggerWarnSpy = jest.spyOn(devkit_1.logger, 'warn');
        let sideEffectsCallback;
        try {
          sideEffectsCallback = yield index_1.default(tree, options);
          sideEffectsCallback();
        } catch (err) {
          expect(err).toEqual(undefined);
        }
        expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          'No package stories found within react-examples. Skipping storybook stories migration...',
        );
      }));
    it(`should move stories from react-examples package to local package within sourceRoot`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const { pathToStoriesWithinReactExamples, getMovedStoriesData } = setup();
        const loggerWarnSpy = jest.spyOn(devkit_1.logger, 'warn');
        expect(tree.exists(pathToStoriesWithinReactExamples)).toBeTruthy();
        const sideEffectsCallback = yield index_1.default(tree, options);
        const { movedStoriesPaths } = getMovedStoriesData();
        expect(tree.exists(movedStoriesPaths.storyOne)).toBe(true);
        expect(tree.exists(movedStoriesPaths.storyTwo)).toBe(true);
        sideEffectsCallback();
        expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
        expect(loggerWarnSpy.mock.calls[0][0]).toEqual('NOTE: Deleting packages/react-examples/src/react-dummy');
        expect(loggerWarnSpy.mock.calls[1][0]).toEqual(
          expect.stringContaining('- Please update your moved stories to follow standard storybook format'),
        );
      }));
    it(`should delete migrated package folder in react-examples`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const { pathToStoriesWithinReactExamples, reactExamplesConfig } = setup();
        expect(tree.exists(pathToStoriesWithinReactExamples)).toBeTruthy();
        yield index_1.default(tree, options);
        expect(tree.exists(`${reactExamplesConfig.root}/src/${options.name}`)).toBe(false);
      }));
    it(`should replace absolute import path with relative one from index.ts`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const { pathToStoriesWithinReactExamples, getMovedStoriesData } = setup();
        expect(tree.exists(pathToStoriesWithinReactExamples)).toBeTruthy();
        yield index_1.default(tree, options);
        const { movedStoriesContent } = getMovedStoriesData();
        expect(movedStoriesContent.storyOne).not.toContain(options.name);
        expect(movedStoriesContent.storyTwo).not.toContain(options.name);
        expect(movedStoriesContent.storyOne).toContain('./index');
        expect(movedStoriesContent.storyTwo).toContain('./index');
      }));
    it(`should append storybook CSF default export`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const { pathToStoriesWithinReactExamples, getMovedStoriesData } = setup();
        expect(tree.exists(pathToStoriesWithinReactExamples)).toBeTruthy();
        yield index_1.default(tree, options);
        const { movedStoriesExportNames, movedStoriesContent } = getMovedStoriesData();
        expect(movedStoriesContent.storyOne).toContain(devkit_1.stripIndents`
        export default {
          title: 'Components/${movedStoriesExportNames.storyOne}',
          component: ${movedStoriesExportNames.storyOne},
        }
        `);
        expect(movedStoriesContent.storyTwo).toContain(devkit_1.stripIndents`
        export default {
          title: 'Components/${movedStoriesExportNames.storyTwo}',
          component: ${movedStoriesExportNames.storyTwo},
        }
      `);
      }));
    it(`should remove package-dependency from react-examples package.json`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const { reactExamplesConfig } = setup();
        let reactExamplesPkgJson = devkit_1.readJson(tree, `${reactExamplesConfig.root}/package.json`);
        expect(reactExamplesPkgJson.dependencies).toEqual(
          expect.objectContaining({
            [options.name]: expect.any(String),
          }),
        );
        yield index_1.default(tree, options);
        reactExamplesPkgJson = devkit_1.readJson(tree, `${reactExamplesConfig.root}/package.json`);
        expect(reactExamplesPkgJson.dependencies).not.toEqual(
          expect.objectContaining({
            [options.name]: expect.any(String),
          }),
        );
      }));
  });
  describe('package.json updates', () => {
    it(`should update package npm scripts`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        let pkgJson = devkit_1.readJson(tree, `${projectConfig.root}/package.json`);
        expect(pkgJson.scripts).toMatchInlineSnapshot(`
        Object {
          "build": "just-scripts build",
          "clean": "just-scripts clean",
          "code-style": "just-scripts code-style",
          "just": "just-scripts",
          "lint": "just-scripts lint",
          "start": "just-scripts dev:storybook",
          "start-test": "just-scripts jest-watch",
          "test": "just-scripts test",
          "update-snapshots": "just-scripts jest -u",
        }
      `);
        yield index_1.default(tree, options);
        pkgJson = devkit_1.readJson(tree, `${projectConfig.root}/package.json`);
        expect(pkgJson.scripts).toEqual({
          docs: 'api-extractor run --config=config/api-extractor.local.json --local',
          // eslint-disable-next-line @fluentui/max-len
          'build:local': `tsc -p . --module esnext --emitDeclarationOnly && node ../../scripts/typescript/normalize-import --output dist/react-dummy/src && yarn docs`,
          build: 'just-scripts build',
          clean: 'just-scripts clean',
          'code-style': 'just-scripts code-style',
          just: 'just-scripts',
          lint: 'just-scripts lint',
          start: 'storybook',
          storybook: 'start-storybook',
          test: 'jest',
        });
      }));
    it(`should create api-extractor.json`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(tree.exists(`${projectConfig.root}/config/api-extractor.json`)).toBeFalsy();
        yield index_1.default(tree, options);
        expect(tree.exists(`${projectConfig.root}/config/api-extractor.json`)).toBeTruthy();
      }));
    it(`should create api-extractor.local.json for scripts:docs task consumption`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(tree.exists(`${projectConfig.root}/config/api-extractor.local.json`)).toBeFalsy();
        yield index_1.default(tree, options);
        expect(tree.exists(`${projectConfig.root}/config/api-extractor.local.json`)).toBeTruthy();
      }));
  });
  describe(`nx workspace updates`, () => {
    it(`should set project 'sourceRoot' in workspace.json`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        let projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(projectConfig.sourceRoot).toBe(undefined);
        yield index_1.default(tree, options);
        projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(projectConfig.sourceRoot).toBe(`${projectConfig.root}/src`);
      }));
    it(`should set project 'vNext' and 'platform:web' tag in nx.json`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        let projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(projectConfig.tags).toBe(undefined);
        yield index_1.default(tree, options);
        projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(projectConfig.tags).toEqual(['vNext', 'platform:web']);
      }));
    it(`should update project tags in nx.json if they already exist`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        let projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        devkit_1.updateProjectConfiguration(
          tree,
          options.name,
          Object.assign(Object.assign({}, projectConfig), { tags: ['vNext'] }),
        );
        projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(projectConfig.tags).toEqual(['vNext']);
        yield index_1.default(tree, options);
        projectConfig = devkit_1.readProjectConfiguration(tree, options.name);
        expect(projectConfig.tags).toEqual(['vNext', 'platform:web']);
      }));
  });
  describe(`--stats`, () => {
    beforeEach(() => {
      setupDummyPackage(tree, { name: '@proj/react-foo', version: '9.0.22' });
      setupDummyPackage(tree, { name: '@proj/react-bar', version: '9.0.31' });
      setupDummyPackage(tree, { name: '@proj/react-old', version: '8.1.12' });
      setupDummyPackage(tree, { name: '@proj/react-older', version: '8.9.12' });
    });
    it(`should print project names and count of how many have been migrated`, () =>
      __awaiter(void 0, void 0, void 0, function*() {
        const loggerInfoSpy = jest.spyOn(devkit_1.logger, 'info');
        yield index_1.default(tree, { stats: true });
        expect(loggerInfoSpy.mock.calls[2][0]).toEqual('Migrated (0):');
        expect(loggerInfoSpy.mock.calls[3][0]).toEqual('');
        expect(loggerInfoSpy.mock.calls[5][0]).toEqual(`Not migrated (3):`);
        expect(loggerInfoSpy.mock.calls[6][0]).toEqual(
          expect.stringContaining(devkit_1.stripIndents`
      - @proj/react-dummy
      - @proj/react-foo
      - @proj/react-bar
      `),
        );
        loggerInfoSpy.mockClear();
        yield index_1.default(tree, options);
        yield index_1.default(tree, { stats: true });
        expect(loggerInfoSpy.mock.calls[2][0]).toEqual('Migrated (1):');
        expect(loggerInfoSpy.mock.calls[5][0]).toEqual(`Not migrated (2):`);
      }));
  });
});
// ==== helpers ====
function setupDummyPackage(tree, options) {
  const workspaceConfig = devkit_1.readWorkspaceConfiguration(tree);
  const defaults = {
    version: '9.0.0-alpha.40',
    dependencies: {
      [`@${workspaceConfig.npmScope}/react-make-styles`]: '^9.0.0-alpha.38',
      [`@${workspaceConfig.npmScope}/react-theme`]: '^9.0.0-alpha.13',
      [`@${workspaceConfig.npmScope}/react-utilities`]: '^9.0.0-alpha.25',
      tslib: '^2.1.0',
      someThirdPartyDep: '^11.1.2',
    },
    compilerOptions: { baseUrl: '.', typeRoots: ['../../node_modules/@types', '../../typings'] },
  };
  const normalizedOptions = Object.assign(Object.assign({}, defaults), options);
  const pkgName = normalizedOptions.name;
  const normalizedPkgName = pkgName.replace(`@${workspaceConfig.npmScope}/`, '');
  const paths = {
    root: `packages/${normalizedPkgName}`,
  };
  const templates = {
    packageJson: {
      name: pkgName,
      version: normalizedOptions.version,
      scripts: {
        build: 'just-scripts build',
        clean: 'just-scripts clean',
        'code-style': 'just-scripts code-style',
        just: 'just-scripts',
        lint: 'just-scripts lint',
        start: 'just-scripts dev:storybook',
        'start-test': 'just-scripts jest-watch',
        test: 'just-scripts test',
        'update-snapshots': 'just-scripts jest -u',
      },
      dependencies: normalizedOptions.dependencies,
    },
    tsConfig: {
      compilerOptions: normalizedOptions.compilerOptions,
    },
    jestConfig: devkit_1.stripIndents`
      const { createConfig } = require('@fluentui/scripts/jest/jest-resources');
      const path = require('path');

      const config = createConfig({
        setupFiles: [path.resolve(path.join(__dirname, 'config', 'tests.js'))],
        snapshotSerializers: ['@fluentui/jest-serializer-make-styles'],
      });

      module.exports = config;
    `,
  };
  tree.write(`${paths.root}/package.json`, workspace_1.serializeJson(templates.packageJson));
  tree.write(`${paths.root}/tsconfig.json`, workspace_1.serializeJson(templates.tsConfig));
  tree.write(`${paths.root}/jest.config.js`, templates.jestConfig);
  devkit_1.addProjectConfiguration(tree, pkgName, {
    root: paths.root,
    projectType: 'library',
    targets: {},
  });
  return tree;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJmaWxlIjoiQzpcXFVzZXJzXFxjemVhclxcRG9jdW1lbnRzXFxmbHVlbnR1aVxcdG9vbHNcXGdlbmVyYXRvcnNcXG1pZ3JhdGUtY29udmVyZ2VkLXBrZ1xcaW5kZXguc3BlYy50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLGtEQUFvRTtBQUNwRSx5Q0FVc0I7QUFDdEIsK0NBQTZEO0FBSTdELG1DQUFnQztBQU9oQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQy9DLGdFQUFnRTtJQUNoRSxNQUFNLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFFdEIsSUFBSSxJQUFVLENBQUM7SUFDZixNQUFNLE9BQU8sR0FBRyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDO0lBRTlDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckQsSUFBSSxHQUFHLHNDQUE0QixFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FDUixnQkFBZ0IsRUFDaEIscUJBQVksQ0FBQTs7O1FBR1YsQ0FDSCxDQUFDO1FBQ0YsSUFBSSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4QyxJQUFJLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFO1lBQzdCLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsT0FBTyxFQUFFLE9BQU87WUFDaEIsWUFBWSxFQUFFO2dCQUNaLENBQUMs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QkFBeUI7Z0JBQ3ZDLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLGtCQUFrQixFQUFFLHNCQUFzQjthQUMzQztZQUNELFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxZQUFZO1NBQzdDO1FBQ0QsUUFBUSxFQUFFO1lBQ1IsZUFBZSxFQUFFLGlCQUFpQixDQUFDLGVBQWU7U0FDbkQ7UUFDRCxVQUFVLEVBQUUscUJBQVksQ0FBQTs7Ozs7Ozs7OztLQVV2QjtLQUNGLENBQUM7SUFFRixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksZUFBZSxFQUFFLHlCQUFhLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDL0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLGdCQUFnQixFQUFFLHlCQUFhLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDN0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUVqRSxnQ0FBdUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1FBQ3JDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixXQUFXLEVBQUUsU0FBUztRQUN0QixPQUFPLEVBQUUsRUFBRTtLQUNaLENBQUMsQ0FBQztJQUVILE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJDOlxcVXNlcnNcXGN6ZWFyXFxEb2N1bWVudHNcXGZsdWVudHVpXFx0b29sc1xcZ2VuZXJhdG9yc1xcbWlncmF0ZS1jb252ZXJnZWQtcGtnXFxpbmRleC5zcGVjLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVRyZWVXaXRoRW1wdHlXb3Jrc3BhY2UgfSBmcm9tICdAbnJ3bC9kZXZraXQvdGVzdGluZyc7XHJcbmltcG9ydCB7XHJcbiAgVHJlZSxcclxuICByZWFkUHJvamVjdENvbmZpZ3VyYXRpb24sXHJcbiAgcmVhZEpzb24sXHJcbiAgc3RyaXBJbmRlbnRzLFxyXG4gIGFkZFByb2plY3RDb25maWd1cmF0aW9uLFxyXG4gIHJlYWRXb3Jrc3BhY2VDb25maWd1cmF0aW9uLFxyXG4gIHVwZGF0ZUpzb24sXHJcbiAgbG9nZ2VyLFxyXG4gIHVwZGF0ZVByb2plY3RDb25maWd1cmF0aW9uLFxyXG59IGZyb20gJ0BucndsL2RldmtpdCc7XHJcbmltcG9ydCB7IHNlcmlhbGl6ZUpzb24sIHN0cmluZ1V0aWxzIH0gZnJvbSAnQG5yd2wvd29ya3NwYWNlJztcclxuXHJcbmltcG9ydCB7IFBhY2thZ2VKc29uLCBUc0NvbmZpZyB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuXHJcbmltcG9ydCBnZW5lcmF0b3IgZnJvbSAnLi9pbmRleCc7XHJcbmltcG9ydCB7IE1pZ3JhdGVDb252ZXJnZWRQa2dHZW5lcmF0b3JTY2hlbWEgfSBmcm9tICcuL3NjaGVtYSc7XHJcblxyXG5pbnRlcmZhY2UgQXNzZXJ0ZWRTY2hlbWEgZXh0ZW5kcyBNaWdyYXRlQ29udmVyZ2VkUGtnR2VuZXJhdG9yU2NoZW1hIHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmRlc2NyaWJlKCdtaWdyYXRlLWNvbnZlcmdlZC1wa2cgZ2VuZXJhdG9yJywgKCkgPT4ge1xyXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktZnVuY3Rpb25cclxuICBjb25zdCBub29wID0gKCkgPT4ge307XHJcblxyXG4gIGxldCB0cmVlOiBUcmVlO1xyXG4gIGNvbnN0IG9wdGlvbnMgPSB7IG5hbWU6ICdAcHJvai9yZWFjdC1kdW1teScgfTtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBqZXN0LnJlc3RvcmVBbGxNb2NrcygpO1xyXG5cclxuICAgIGplc3Quc3B5T24oY29uc29sZSwgJ2xvZycpLm1vY2tJbXBsZW1lbnRhdGlvbihub29wKTtcclxuICAgIGplc3Quc3B5T24oY29uc29sZSwgJ2luZm8nKS5tb2NrSW1wbGVtZW50YXRpb24obm9vcCk7XHJcbiAgICBqZXN0LnNweU9uKGNvbnNvbGUsICd3YXJuJykubW9ja0ltcGxlbWVudGF0aW9uKG5vb3ApO1xyXG5cclxuICAgIHRyZWUgPSBjcmVhdGVUcmVlV2l0aEVtcHR5V29ya3NwYWNlKCk7XHJcbiAgICB0cmVlLndyaXRlKFxyXG4gICAgICAnamVzdC5jb25maWcuanMnLFxyXG4gICAgICBzdHJpcEluZGVudHNgXHJcbiAgICAgIG1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgICAgICAgcHJvamVjdHM6IFtdXHJcbiAgICAgIH1gLFxyXG4gICAgKTtcclxuICAgIHRyZWUgPSBzZXR1cER1bW15UGFja2FnZSh0cmVlLCBvcHRpb25zKTtcclxuICAgIHRyZWUgPSBzZXR1cER1bW15UGFja2FnZSh0cmVlLCB7XHJcbiAgICAgIG5hbWU6ICdAcHJvai9yZWFjdC1leGFtcGxlcycsXHJcbiAgICAgIHZlcnNpb246ICc4LjAuMCcsXHJcbiAgICAgIGRlcGVuZGVuY2llczoge1xyXG4gICAgICAgIFtvcHRpb25zLm5hbWVdOiAnOS4wLjQwLWFscGhhMScsXHJcbiAgICAgICAgJ0Bwcm9qL29sZC12OC1mb28nOiAnOC4wLjQwJyxcclxuICAgICAgICAnQHByb2ovb2xkLXY4LWJhcic6ICc4LjAuNDEnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdnZW5lcmFsJywgKCkgPT4ge1xyXG4gICAgaXQoYHNob3VsZCB0aHJvdyBlcnJvciBpZiBuYW1lIGlzIGVtcHR5YCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBleHBlY3QoZ2VuZXJhdG9yKHRyZWUsIHsgbmFtZTogJycgfSkpLnJlamVjdHMudG9NYXRjaElubGluZVNuYXBzaG90KFxyXG4gICAgICAgIGBbRXJyb3I6IC0tbmFtZSBjYW5ub3QgYmUgZW1wdHkuIFBsZWFzZSBwcm92aWRlIG5hbWUgb2YgdGhlIHBhY2thZ2UuXWAsXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChgc2hvdWxkIHRocm93IGVycm9yIGlmIHByb3ZpZGVkIG5hbWUgZG9lc24ndCBtYXRjaCBleGlzdGluZyBwYWNrYWdlYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBleHBlY3QoZ2VuZXJhdG9yKHRyZWUsIHsgbmFtZTogJ0Bwcm9qL25vbi1leGlzdGVudC1saWInIH0pKS5yZWplY3RzLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChcclxuICAgICAgICBgW0Vycm9yOiBDYW5ub3QgZmluZCBjb25maWd1cmF0aW9uIGZvciAnQHByb2ovbm9uLWV4aXN0ZW50LWxpYicgaW4gL3dvcmtzcGFjZS5qc29uLl1gLFxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoYHNob3VsZCB0aHJvdyBlcnJvciBpZiB1c2VyIHdhbnRzIG1pZ3JhdGUgbm9uIGNvbnZlcmdlZCBwYWNrYWdlYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcbiAgICAgIHVwZGF0ZUpzb24odHJlZSwgYCR7cHJvamVjdENvbmZpZy5yb290fS9wYWNrYWdlLmpzb25gLCBqc29uID0+IHtcclxuICAgICAgICBqc29uLnZlcnNpb24gPSAnOC4wLjAnO1xyXG4gICAgICAgIHJldHVybiBqc29uO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChnZW5lcmF0b3IodHJlZSwgb3B0aW9ucykpLnJlamVjdHMudG9NYXRjaElubGluZVNuYXBzaG90KFxyXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAZmx1ZW50dWkvbWF4LWxlblxyXG4gICAgICAgIGBbRXJyb3I6IEBwcm9qL3JlYWN0LWR1bW15IGlzIG5vdCBjb252ZXJnZWQgcGFja2FnZS4gTWFrZSBzdXJlIHRvIHJ1biB0aGUgbWlncmF0aW9uIG9uIHBhY2thZ2VzIHdpdGggdmVyc2lvbiA5LngueF1gLFxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKGB0c2NvbmZpZyB1cGRhdGVzYCwgKCkgPT4ge1xyXG4gICAgZnVuY3Rpb24gZ2V0VHNDb25maWcocHJvamVjdDogUmV0dXJuVHlwZTx0eXBlb2YgcmVhZFByb2plY3RDb25maWd1cmF0aW9uPikge1xyXG4gICAgICByZXR1cm4gcmVhZEpzb24odHJlZSwgYCR7cHJvamVjdC5yb290fS90c2NvbmZpZy5qc29uYCk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBnZXRCYXNlVHNDb25maWcoKSB7XHJcbiAgICAgIHJldHVybiByZWFkSnNvbjxUc0NvbmZpZz4odHJlZSwgYC90c2NvbmZpZy5iYXNlLmpzb25gKTtcclxuICAgIH1cclxuXHJcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSBwYWNrYWdlIGxvY2FsIHRzY29uZmlnLmpzb24nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHByb2plY3RDb25maWcgPSByZWFkUHJvamVjdENvbmZpZ3VyYXRpb24odHJlZSwgb3B0aW9ucy5uYW1lKTtcclxuXHJcbiAgICAgIGxldCB0c0NvbmZpZyA9IGdldFRzQ29uZmlnKHByb2plY3RDb25maWcpO1xyXG5cclxuICAgICAgZXhwZWN0KHRzQ29uZmlnKS50b0VxdWFsKHtcclxuICAgICAgICBjb21waWxlck9wdGlvbnM6IHtcclxuICAgICAgICAgIGJhc2VVcmw6ICcuJyxcclxuICAgICAgICAgIHR5cGVSb290czogWycuLi8uLi9ub2RlX21vZHVsZXMvQHR5cGVzJywgJy4uLy4uL3R5cGluZ3MnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGdlbmVyYXRvcih0cmVlLCBvcHRpb25zKTtcclxuXHJcbiAgICAgIHRzQ29uZmlnID0gZ2V0VHNDb25maWcocHJvamVjdENvbmZpZyk7XHJcblxyXG4gICAgICBleHBlY3QodHNDb25maWcpLnRvRXF1YWwoe1xyXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczoge1xyXG4gICAgICAgICAgZGVjbGFyYXRpb246IHRydWUsXHJcbiAgICAgICAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxyXG4gICAgICAgICAgaW1wb3J0SGVscGVyczogdHJ1ZSxcclxuICAgICAgICAgIGpzeDogJ3JlYWN0JyxcclxuICAgICAgICAgIGxpYjogWydlczUnLCAnZG9tJ10sXHJcbiAgICAgICAgICBtb2R1bGU6ICdDb21tb25KUycsXHJcbiAgICAgICAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcclxuICAgICAgICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgICAgICAgcHJlc2VydmVDb25zdEVudW1zOiB0cnVlLFxyXG4gICAgICAgICAgdGFyZ2V0OiAnRVM1JyxcclxuICAgICAgICAgIHR5cGVzOiBbJ2plc3QnLCAnY3VzdG9tLWdsb2JhbCcsICdpbmxpbmUtc3R5bGUtZXhwYW5kLXNob3J0aGFuZCddLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXh0ZW5kczogJy4uLy4uL3RzY29uZmlnLmJhc2UuanNvbicsXHJcbiAgICAgICAgaW5jbHVkZTogWydzcmMnXSxcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSBjb21waWxlck9wdGlvbnMudHlwZXMgZGVmaW5pdGlvbiBmb3IgbG9jYWwgdHNjb25maWcuanNvbicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcHJvamVjdENvbmZpZyA9IHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBvcHRpb25zLm5hbWUpO1xyXG5cclxuICAgICAgdXBkYXRlSnNvbih0cmVlLCBgJHtwcm9qZWN0Q29uZmlnLnJvb3R9L3RzY29uZmlnLmpzb25gLCAoanNvbjogVHNDb25maWcpID0+IHtcclxuICAgICAgICBqc29uLmNvbXBpbGVyT3B0aW9ucy50eXBlcyA9IFsnamVzdCcsICdAdGVzdGluZy1saWJyYXJ5L2plc3QtZG9tJywgJ2Zvby1iYXInXTtcclxuICAgICAgICByZXR1cm4ganNvbjtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICBjb25zdCB0c0NvbmZpZyA9IGdldFRzQ29uZmlnKHByb2plY3RDb25maWcpO1xyXG5cclxuICAgICAgZXhwZWN0KHRzQ29uZmlnLmNvbXBpbGVyT3B0aW9ucy50eXBlcykudG9FcXVhbChbXHJcbiAgICAgICAgJ2plc3QnLFxyXG4gICAgICAgICdjdXN0b20tZ2xvYmFsJyxcclxuICAgICAgICAnaW5saW5lLXN0eWxlLWV4cGFuZC1zaG9ydGhhbmQnLFxyXG4gICAgICAgICdAdGVzdGluZy1saWJyYXJ5L2plc3QtZG9tJyxcclxuICAgICAgICAnZm9vLWJhcicsXHJcbiAgICAgIF0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBmbHVlbnR1aS9tYXgtbGVuXHJcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSByb290IHRzY29uZmlnLmJhc2UuanNvbiB3aXRoIG1pZ3JhdGVkIHBhY2thZ2UgYWxpYXMgaW5jbHVkaW5nIGFsbCBtaXNzaW5nIGFsaWFzZXMgYmFzZWQgb24gcGFja2FnZXMgZGVwZW5kZW5jaWVzIGxpc3QnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIHNldHVwRHVtbXlQYWNrYWdlKHRyZWUsIHsgbmFtZTogJ0Bwcm9qL3JlYWN0LW1ha2Utc3R5bGVzJywgZGVwZW5kZW5jaWVzOiB7fSB9KTtcclxuICAgICAgc2V0dXBEdW1teVBhY2thZ2UodHJlZSwgeyBuYW1lOiAnQHByb2ovcmVhY3QtdGhlbWUnLCBkZXBlbmRlbmNpZXM6IHt9IH0pO1xyXG4gICAgICBzZXR1cER1bW15UGFja2FnZSh0cmVlLCB7IG5hbWU6ICdAcHJvai9yZWFjdC11dGlsaXRpZXMnLCBkZXBlbmRlbmNpZXM6IHt9IH0pO1xyXG5cclxuICAgICAgbGV0IHJvb3RUc0NvbmZpZyA9IGdldEJhc2VUc0NvbmZpZygpO1xyXG5cclxuICAgICAgZXhwZWN0KHJvb3RUc0NvbmZpZykudG9FcXVhbCh7XHJcbiAgICAgICAgY29tcGlsZXJPcHRpb25zOiB7XHJcbiAgICAgICAgICBwYXRoczoge30sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICByb290VHNDb25maWcgPSBnZXRCYXNlVHNDb25maWcoKTtcclxuXHJcbiAgICAgIGV4cGVjdChyb290VHNDb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzKS50b0VxdWFsKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICdAcHJvai9yZWFjdC1kdW1teSc6IFsncGFja2FnZXMvcmVhY3QtZHVtbXkvc3JjL2luZGV4LnRzJ10sXHJcbiAgICAgICAgICAnQHByb2ovcmVhY3QtbWFrZS1zdHlsZXMnOiBbJ3BhY2thZ2VzL3JlYWN0LW1ha2Utc3R5bGVzL3NyYy9pbmRleC50cyddLFxyXG4gICAgICAgICAgJ0Bwcm9qL3JlYWN0LXRoZW1lJzogWydwYWNrYWdlcy9yZWFjdC10aGVtZS9zcmMvaW5kZXgudHMnXSxcclxuICAgICAgICAgICdAcHJvai9yZWFjdC11dGlsaXRpZXMnOiBbJ3BhY2thZ2VzL3JlYWN0LXV0aWxpdGllcy9zcmMvaW5kZXgudHMnXSxcclxuICAgICAgICB9KSxcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGV4cGVjdChcclxuICAgICAgICBPYmplY3Qua2V5cyhcclxuICAgICAgICAgIHJvb3RUc0NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHMgYXMgUmVxdWlyZWQ8UGljazxUc0NvbmZpZ1snY29tcGlsZXJPcHRpb25zJ10sICdwYXRocyc+PlsncGF0aHMnXSxcclxuICAgICAgICApLFxyXG4gICAgICApLm5vdC50b0NvbnRhaW4oWyd0c2xpYicsICdzb21lVGhpcmRQYXJ0eURlcCddKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZShgamVzdCBjb25maWcgdXBkYXRlc2AsICgpID0+IHtcclxuICAgIGl0KGBzaG91bGQgc2V0dXAgbmV3IGxvY2FsIGplc3QgY29uZmlnIHdoaWNoIGV4dGVuZHMgZnJvbSByb290IGAsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcHJvamVjdENvbmZpZyA9IHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBvcHRpb25zLm5hbWUpO1xyXG4gICAgICBmdW5jdGlvbiBnZXRKZXN0Q29uZmlnKCkge1xyXG4gICAgICAgIHJldHVybiB0cmVlLnJlYWQoYCR7cHJvamVjdENvbmZpZy5yb290fS9qZXN0LmNvbmZpZy5qc2ApPy50b1N0cmluZygndXRmLTgnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IGplc3RDb25maWcgPSBnZXRKZXN0Q29uZmlnKCk7XHJcblxyXG4gICAgICBleHBlY3QoamVzdENvbmZpZykudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuICAgICAgICBcImNvbnN0IHsgY3JlYXRlQ29uZmlnIH0gPSByZXF1aXJlKCdAZmx1ZW50dWkvc2NyaXB0cy9qZXN0L2plc3QtcmVzb3VyY2VzJyk7XHJcbiAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcclxuXHJcbiAgICAgICAgY29uc3QgY29uZmlnID0gY3JlYXRlQ29uZmlnKHtcclxuICAgICAgICBzZXR1cEZpbGVzOiBbcGF0aC5yZXNvbHZlKHBhdGguam9pbihfX2Rpcm5hbWUsICdjb25maWcnLCAndGVzdHMuanMnKSldLFxyXG4gICAgICAgIHNuYXBzaG90U2VyaWFsaXplcnM6IFsnQGZsdWVudHVpL2plc3Qtc2VyaWFsaXplci1tYWtlLXN0eWxlcyddLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGNvbmZpZztcIlxyXG4gICAgICBgKTtcclxuXHJcbiAgICAgIGF3YWl0IGdlbmVyYXRvcih0cmVlLCBvcHRpb25zKTtcclxuXHJcbiAgICAgIGplc3RDb25maWcgPSBnZXRKZXN0Q29uZmlnKCk7XHJcblxyXG4gICAgICBleHBlY3QoamVzdENvbmZpZykudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuICAgICAgICBcIi8vIEB0cy1jaGVja1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIEB0eXBlIHtqZXN0LkluaXRpYWxPcHRpb25zfVxyXG4gICAgICAgICovXHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICAgICAgZGlzcGxheU5hbWU6ICdyZWFjdC1kdW1teScsXHJcbiAgICAgICAgcHJlc2V0OiAnLi4vLi4vamVzdC5wcmVzZXQuanMnLFxyXG4gICAgICAgIGdsb2JhbHM6IHtcclxuICAgICAgICAndHMtamVzdCc6IHtcclxuICAgICAgICB0c0NvbmZpZzogJzxyb290RGlyPi90c2NvbmZpZy5qc29uJyxcclxuICAgICAgICBkaWFnbm9zdGljczogZmFsc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRyYW5zZm9ybToge1xyXG4gICAgICAgICdeLitcXFxcXFxcXFxcXFxcXFxcLnRzeD8kJzogJ3RzLWplc3QnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY292ZXJhZ2VEaXJlY3Rvcnk6ICcuL2NvdmVyYWdlJyxcclxuICAgICAgICBzZXR1cEZpbGVzQWZ0ZXJFbnY6IFsnLi9jb25maWcvdGVzdHMuanMnXSxcclxuICAgICAgICBzbmFwc2hvdFNlcmlhbGl6ZXJzOiBbJ0BmbHVlbnR1aS9qZXN0LXNlcmlhbGl6ZXItbWFrZS1zdHlsZXMnXSxcclxuICAgICAgICB9O1wiXHJcbiAgICAgIGApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoYHNob3VsZCBhZGQgcHJvamVjdCB0byByb290IGplc3QuY29uZmlnLmpzYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBmdW5jdGlvbiBnZXRKZXN0Q29uZmlnKCkge1xyXG4gICAgICAgIHJldHVybiB0cmVlLnJlYWQoYC9qZXN0LmNvbmZpZy5qc2ApPy50b1N0cmluZygndXRmLTgnKTtcclxuICAgICAgfVxyXG4gICAgICBsZXQgamVzdENvbmZpZyA9IGdldEplc3RDb25maWcoKTtcclxuXHJcbiAgICAgIGV4cGVjdChqZXN0Q29uZmlnKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG4gICAgICAgIFwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICAgICAgcHJvamVjdHM6IFtdXHJcbiAgICAgICAgfVwiXHJcbiAgICAgIGApO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgamVzdENvbmZpZyA9IGdldEplc3RDb25maWcoKTtcclxuXHJcbiAgICAgIGV4cGVjdChqZXN0Q29uZmlnKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG4gICAgICAgIFwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICAgICAgcHJvamVjdHM6IFtcXFxcXCI8cm9vdERpcj4vcGFja2FnZXMvcmVhY3QtZHVtbXlcXFxcXCJdXHJcbiAgICAgICAgfVwiXHJcbiAgICAgIGApO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKGBzdG9yeWJvb2sgdXBkYXRlc2AsICgpID0+IHtcclxuICAgIGl0KGBzaG91bGQgc2V0dXAgbG9jYWwgc3Rvcnlib29rYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcbiAgICAgIGNvbnN0IHByb2plY3RTdG9yeWJvb2tDb25maWdQYXRoID0gYCR7cHJvamVjdENvbmZpZy5yb290fS8uc3Rvcnlib29rYDtcclxuXHJcbiAgICAgIGV4cGVjdCh0cmVlLmV4aXN0cyhwcm9qZWN0U3Rvcnlib29rQ29uZmlnUGF0aCkpLnRvQmVGYWxzeSgpO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgZXhwZWN0KHRyZWUuZXhpc3RzKHByb2plY3RTdG9yeWJvb2tDb25maWdQYXRoKSkudG9CZVRydXRoeSgpO1xyXG4gICAgICBleHBlY3QocmVhZEpzb24odHJlZSwgYCR7cHJvamVjdFN0b3J5Ym9va0NvbmZpZ1BhdGh9L3RzY29uZmlnLmpzb25gKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuICAgICAgICBPYmplY3Qge1xyXG4gICAgICAgICAgXCJjb21waWxlck9wdGlvbnNcIjogT2JqZWN0IHtcclxuICAgICAgICAgICAgXCJhbGxvd0pzXCI6IHRydWUsXHJcbiAgICAgICAgICAgIFwiY2hlY2tKc1wiOiB0cnVlLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIFwiZXhjbHVkZVwiOiBBcnJheSBbXHJcbiAgICAgICAgICAgIFwiLi4vKiovKi50ZXN0LnRzXCIsXHJcbiAgICAgICAgICAgIFwiLi4vKiovKi50ZXN0LmpzXCIsXHJcbiAgICAgICAgICAgIFwiLi4vKiovKi50ZXN0LnRzeFwiLFxyXG4gICAgICAgICAgICBcIi4uLyoqLyoudGVzdC5qc3hcIixcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBcImV4dGVuZHNcIjogXCIuLi90c2NvbmZpZy5qc29uXCIsXHJcbiAgICAgICAgICBcImluY2x1ZGVcIjogQXJyYXkgW1xyXG4gICAgICAgICAgICBcIi4uL3NyYy8qKi8qXCIsXHJcbiAgICAgICAgICAgIFwiKi5qc1wiLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9XHJcbiAgICAgIGApO1xyXG5cclxuICAgICAgLyogZXNsaW50LWRpc2FibGUgQGZsdWVudHVpL21heC1sZW4gKi9cclxuICAgICAgZXhwZWN0KHRyZWUucmVhZChgJHtwcm9qZWN0U3Rvcnlib29rQ29uZmlnUGF0aH0vbWFpbi5qc2ApPy50b1N0cmluZygndXRmLTgnKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuICAgICAgICBcImNvbnN0IHJvb3RNYWluID0gcmVxdWlyZSgnLi4vLi4vLi4vLnN0b3J5Ym9vay9tYWluJyk7XHJcblxyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gLyoqIEB0eXBlIHtQaWNrPGltcG9ydCgnLi4vLi4vLi4vLnN0b3J5Ym9vay9tYWluJykuU3Rvcnlib29rQ29uZmlnLCdhZGRvbnMnfCdzdG9yaWVzJ3wnd2VicGFja0ZpbmFsJz59ICovICh7XHJcbiAgICAgICAgc3RvcmllczogWy4uLnJvb3RNYWluLnN0b3JpZXMsICcuLi9zcmMvKiovKi5zdG9yaWVzLm1keCcsICcuLi9zcmMvKiovKi5zdG9yaWVzLkAodHN8dHN4KSddLFxyXG4gICAgICAgIGFkZG9uczogWy4uLnJvb3RNYWluLmFkZG9uc10sXHJcbiAgICAgICAgd2VicGFja0ZpbmFsOiAoY29uZmlnLCBvcHRpb25zKSA9PiB7XHJcbiAgICAgICAgY29uc3QgbG9jYWxDb25maWcgPSB7IC4uLnJvb3RNYWluLndlYnBhY2tGaW5hbChjb25maWcsIG9wdGlvbnMpIH07XHJcblxyXG4gICAgICAgIHJldHVybiBsb2NhbENvbmZpZztcclxuICAgICAgICB9LFxyXG4gICAgICAgIH0pO1wiXHJcbiAgICAgIGApO1xyXG4gICAgICAvKiBlc2xpbnQtZW5hYmxlIEBmbHVlbnR1aS9tYXgtbGVuICovXHJcblxyXG4gICAgICBleHBlY3QodHJlZS5yZWFkKGAke3Byb2plY3RTdG9yeWJvb2tDb25maWdQYXRofS9wcmV2aWV3LmpzYCk/LnRvU3RyaW5nKCd1dGYtOCcpKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG4gICAgICAgIFwiaW1wb3J0ICogYXMgcm9vdFByZXZpZXcgZnJvbSAnLi4vLi4vLi4vLnN0b3J5Ym9vay9wcmV2aWV3JztcclxuXHJcbiAgICAgICAgZXhwb3J0IGNvbnN0IGRlY29yYXRvcnMgPSBbLi4ucm9vdFByZXZpZXcuZGVjb3JhdG9yc107XCJcclxuICAgICAgYCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBzZXR1cCgpIHtcclxuICAgICAgY29uc3Qgd29ya3NwYWNlQ29uZmlnID0gcmVhZFdvcmtzcGFjZUNvbmZpZ3VyYXRpb24odHJlZSk7XHJcbiAgICAgIGNvbnN0IHByb2plY3RDb25maWcgPSByZWFkUHJvamVjdENvbmZpZ3VyYXRpb24odHJlZSwgb3B0aW9ucy5uYW1lKTtcclxuICAgICAgY29uc3Qgbm9ybWFsaXplZFByb2plY3ROYW1lID0gb3B0aW9ucy5uYW1lLnJlcGxhY2UoYEAke3dvcmtzcGFjZUNvbmZpZy5ucG1TY29wZX0vYCwgJycpO1xyXG4gICAgICBjb25zdCByZWFjdEV4YW1wbGVzQ29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsICdAcHJvai9yZWFjdC1leGFtcGxlcycpO1xyXG4gICAgICBjb25zdCBwYXRoVG9TdG9yaWVzV2l0aGluUmVhY3RFeGFtcGxlcyA9IGAke3JlYWN0RXhhbXBsZXNDb25maWcucm9vdH0vc3JjLyR7bm9ybWFsaXplZFByb2plY3ROYW1lfWA7XHJcblxyXG4gICAgICBjb25zdCBwYXRocyA9IHtcclxuICAgICAgICByZWFjdEV4YW1wbGVzOiB7XHJcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGZsdWVudHVpL21heC1sZW5cclxuICAgICAgICAgIC8vICBvcHRpb25zLm5hbWU9PT0nQHByb2ovcmVhY3QtZHVtbXknIC0+IHJlYWN0LWV4YW1wbGVzL3NyYy9yZWFjdC1kdW1teS9SZWFjdER1bW15T3RoZXIvUmVhY3REdW1teS5zdG9yaWVzLnRzeFxyXG4gICAgICAgICAgc3RvcnlGaWxlT25lOiBgJHtwYXRoVG9TdG9yaWVzV2l0aGluUmVhY3RFeGFtcGxlc30vJHtzdHJpbmdVdGlscy5jbGFzc2lmeShcclxuICAgICAgICAgICAgbm9ybWFsaXplZFByb2plY3ROYW1lLFxyXG4gICAgICAgICAgKX0vJHtzdHJpbmdVdGlscy5jbGFzc2lmeShub3JtYWxpemVkUHJvamVjdE5hbWUpfS5zdG9yaWVzLnRzeGAsXHJcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGZsdWVudHVpL21heC1sZW5cclxuICAgICAgICAgIC8vIGlmIG9wdGlvbnMubmFtZT09PSdAcHJvai9yZWFjdC1kdW1teScgLT4gcmVhY3QtZXhhbXBsZXMvc3JjL3JlYWN0LWR1bW15L1JlYWN0RHVtbXlPdGhlci9SZWFjdER1bW15T3RoZXIuc3Rvcmllcy50c3hcclxuICAgICAgICAgIHN0b3J5RmlsZVR3bzogYCR7cGF0aFRvU3Rvcmllc1dpdGhpblJlYWN0RXhhbXBsZXN9LyR7c3RyaW5nVXRpbHMuY2xhc3NpZnkoXHJcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9qZWN0TmFtZSxcclxuICAgICAgICAgICl9T3RoZXIvJHtzdHJpbmdVdGlscy5jbGFzc2lmeShub3JtYWxpemVkUHJvamVjdE5hbWUpfU90aGVyLnN0b3JpZXMudHN4YCxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdHJlZS53cml0ZShcclxuICAgICAgICBwYXRocy5yZWFjdEV4YW1wbGVzLnN0b3J5RmlsZU9uZSxcclxuICAgICAgICBzdHJpcEluZGVudHNgXHJcbiAgICAgICAgIGltcG9ydCAqIGFzIEltcGxlbWVudGF0aW9uIGZyb20gJyR7b3B0aW9ucy5uYW1lfSc7XHJcbiAgICAgICAgIGV4cG9ydCBjb25zdCBGb28gPSAocHJvcHM6IEZvb1Byb3BzKSA9PiB7IHJldHVybiA8ZGl2PkZvbzwvZGl2PjsgfVxyXG4gICAgICAgIGAsXHJcbiAgICAgICk7XHJcblxyXG4gICAgICB0cmVlLndyaXRlKFxyXG4gICAgICAgIHBhdGhzLnJlYWN0RXhhbXBsZXMuc3RvcnlGaWxlVHdvLFxyXG4gICAgICAgIHN0cmlwSW5kZW50c2BcclxuICAgICAgICAgaW1wb3J0ICogYXMgSW1wbGVtZW50YXRpb24gZnJvbSAnJHtvcHRpb25zLm5hbWV9JztcclxuICAgICAgICAgZXhwb3J0IGNvbnN0IEZvb090aGVyID0gKHByb3BzOiBGb29Qcm9wc090aGVyKSA9PiB7IHJldHVybiA8ZGl2PkZvb090aGVyPC9kaXY+OyB9XHJcbiAgICAgICAgYCxcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGZ1bmN0aW9uIGdldE1vdmVkU3Rvcmllc0RhdGEoKSB7XHJcbiAgICAgICAgY29uc3QgbW92ZWRTdG9yaWVzRXhwb3J0TmFtZXMgPSB7XHJcbiAgICAgICAgICBzdG9yeU9uZTogYCR7c3RyaW5nVXRpbHMuY2xhc3NpZnkobm9ybWFsaXplZFByb2plY3ROYW1lKX1gLFxyXG4gICAgICAgICAgc3RvcnlUd286IGAke3N0cmluZ1V0aWxzLmNsYXNzaWZ5KG5vcm1hbGl6ZWRQcm9qZWN0TmFtZSl9T3RoZXJgLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgbW92ZWRTdG9yaWVzRmlsZU5hbWVzID0ge1xyXG4gICAgICAgICAgc3RvcnlPbmU6IGAke21vdmVkU3Rvcmllc0V4cG9ydE5hbWVzLnN0b3J5T25lfS5zdG9yaWVzLnRzeGAsXHJcbiAgICAgICAgICBzdG9yeVR3bzogYCR7bW92ZWRTdG9yaWVzRXhwb3J0TmFtZXMuc3RvcnlUd299LnN0b3JpZXMudHN4YCxcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IG1vdmVkU3Rvcmllc1BhdGhzID0ge1xyXG4gICAgICAgICAgc3RvcnlPbmU6IGAke3Byb2plY3RDb25maWcucm9vdH0vc3JjLyR7bW92ZWRTdG9yaWVzRmlsZU5hbWVzLnN0b3J5T25lfWAsXHJcbiAgICAgICAgICBzdG9yeVR3bzogYCR7cHJvamVjdENvbmZpZy5yb290fS9zcmMvJHttb3ZlZFN0b3JpZXNGaWxlTmFtZXMuc3RvcnlUd299YCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBtb3ZlZFN0b3JpZXNDb250ZW50ID0ge1xyXG4gICAgICAgICAgc3RvcnlPbmU6IHRyZWUucmVhZChtb3ZlZFN0b3JpZXNQYXRocy5zdG9yeU9uZSk/LnRvU3RyaW5nKCd1dGYtOCcpLFxyXG4gICAgICAgICAgc3RvcnlUd286IHRyZWUucmVhZChtb3ZlZFN0b3JpZXNQYXRocy5zdG9yeVR3byk/LnRvU3RyaW5nKCd1dGYtOCcpLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiB7IG1vdmVkU3Rvcmllc1BhdGhzLCBtb3ZlZFN0b3JpZXNFeHBvcnROYW1lcywgbW92ZWRTdG9yaWVzRmlsZU5hbWVzLCBtb3ZlZFN0b3JpZXNDb250ZW50IH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgcHJvamVjdENvbmZpZyxcclxuICAgICAgICByZWFjdEV4YW1wbGVzQ29uZmlnLFxyXG4gICAgICAgIHdvcmtzcGFjZUNvbmZpZyxcclxuICAgICAgICBub3JtYWxpemVkUHJvamVjdE5hbWUsXHJcbiAgICAgICAgcGF0aFRvU3Rvcmllc1dpdGhpblJlYWN0RXhhbXBsZXMsXHJcbiAgICAgICAgZ2V0TW92ZWRTdG9yaWVzRGF0YSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpdChgc2hvdWxkIHdvcmsgaWYgdGhlcmUgYXJlIG5vIHBhY2thZ2Ugc3RvcmllcyBpbiByZWFjdC1leGFtcGxlc2AsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcmVhY3RFeGFtcGxlc0NvbmZpZyA9IHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCAnQHByb2ovcmVhY3QtZXhhbXBsZXMnKTtcclxuICAgICAgY29uc3Qgd29ya3NwYWNlQ29uZmlnID0gcmVhZFdvcmtzcGFjZUNvbmZpZ3VyYXRpb24odHJlZSk7XHJcblxyXG4gICAgICBleHBlY3QoXHJcbiAgICAgICAgdHJlZS5leGlzdHMoYCR7cmVhY3RFeGFtcGxlc0NvbmZpZy5yb290fS9zcmMvJHtvcHRpb25zLm5hbWUucmVwbGFjZShgQCR7d29ya3NwYWNlQ29uZmlnLm5wbVNjb3BlfS9gLCAnJyl9YCksXHJcbiAgICAgICkudG9CZShmYWxzZSk7XHJcblxyXG4gICAgICBjb25zdCBsb2dnZXJXYXJuU3B5ID0gamVzdC5zcHlPbihsb2dnZXIsICd3YXJuJyk7XHJcbiAgICAgIGxldCBzaWRlRWZmZWN0c0NhbGxiYWNrOiAoKSA9PiB2b2lkO1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBzaWRlRWZmZWN0c0NhbGxiYWNrID0gYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG4gICAgICAgIHNpZGVFZmZlY3RzQ2FsbGJhY2soKTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgZXhwZWN0KGVycikudG9FcXVhbCh1bmRlZmluZWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBleHBlY3QobG9nZ2VyV2FyblNweSkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xyXG4gICAgICBleHBlY3QobG9nZ2VyV2FyblNweSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgJ05vIHBhY2thZ2Ugc3RvcmllcyBmb3VuZCB3aXRoaW4gcmVhY3QtZXhhbXBsZXMuIFNraXBwaW5nIHN0b3J5Ym9vayBzdG9yaWVzIG1pZ3JhdGlvbi4uLicsXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChgc2hvdWxkIG1vdmUgc3RvcmllcyBmcm9tIHJlYWN0LWV4YW1wbGVzIHBhY2thZ2UgdG8gbG9jYWwgcGFja2FnZSB3aXRoaW4gc291cmNlUm9vdGAsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgeyBwYXRoVG9TdG9yaWVzV2l0aGluUmVhY3RFeGFtcGxlcywgZ2V0TW92ZWRTdG9yaWVzRGF0YSB9ID0gc2V0dXAoKTtcclxuXHJcbiAgICAgIGNvbnN0IGxvZ2dlcldhcm5TcHkgPSBqZXN0LnNweU9uKGxvZ2dlciwgJ3dhcm4nKTtcclxuXHJcbiAgICAgIGV4cGVjdCh0cmVlLmV4aXN0cyhwYXRoVG9TdG9yaWVzV2l0aGluUmVhY3RFeGFtcGxlcykpLnRvQmVUcnV0aHkoKTtcclxuXHJcbiAgICAgIGNvbnN0IHNpZGVFZmZlY3RzQ2FsbGJhY2sgPSBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICBjb25zdCB7IG1vdmVkU3Rvcmllc1BhdGhzIH0gPSBnZXRNb3ZlZFN0b3JpZXNEYXRhKCk7XHJcblxyXG4gICAgICBleHBlY3QodHJlZS5leGlzdHMobW92ZWRTdG9yaWVzUGF0aHMuc3RvcnlPbmUpKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QodHJlZS5leGlzdHMobW92ZWRTdG9yaWVzUGF0aHMuc3RvcnlUd28pKS50b0JlKHRydWUpO1xyXG5cclxuICAgICAgc2lkZUVmZmVjdHNDYWxsYmFjaygpO1xyXG5cclxuICAgICAgZXhwZWN0KGxvZ2dlcldhcm5TcHkpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTtcclxuICAgICAgZXhwZWN0KGxvZ2dlcldhcm5TcHkubW9jay5jYWxsc1swXVswXSkudG9FcXVhbCgnTk9URTogRGVsZXRpbmcgcGFja2FnZXMvcmVhY3QtZXhhbXBsZXMvc3JjL3JlYWN0LWR1bW15Jyk7XHJcbiAgICAgIGV4cGVjdChsb2dnZXJXYXJuU3B5Lm1vY2suY2FsbHNbMV1bMF0pLnRvRXF1YWwoXHJcbiAgICAgICAgZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJy0gUGxlYXNlIHVwZGF0ZSB5b3VyIG1vdmVkIHN0b3JpZXMgdG8gZm9sbG93IHN0YW5kYXJkIHN0b3J5Ym9vayBmb3JtYXQnKSxcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KGBzaG91bGQgZGVsZXRlIG1pZ3JhdGVkIHBhY2thZ2UgZm9sZGVyIGluIHJlYWN0LWV4YW1wbGVzYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB7IHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzLCByZWFjdEV4YW1wbGVzQ29uZmlnIH0gPSBzZXR1cCgpO1xyXG5cclxuICAgICAgZXhwZWN0KHRyZWUuZXhpc3RzKHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzKSkudG9CZVRydXRoeSgpO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgZXhwZWN0KHRyZWUuZXhpc3RzKGAke3JlYWN0RXhhbXBsZXNDb25maWcucm9vdH0vc3JjLyR7b3B0aW9ucy5uYW1lfWApKS50b0JlKGZhbHNlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KGBzaG91bGQgcmVwbGFjZSBhYnNvbHV0ZSBpbXBvcnQgcGF0aCB3aXRoIHJlbGF0aXZlIG9uZSBmcm9tIGluZGV4LnRzYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB7IHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzLCBnZXRNb3ZlZFN0b3JpZXNEYXRhIH0gPSBzZXR1cCgpO1xyXG5cclxuICAgICAgZXhwZWN0KHRyZWUuZXhpc3RzKHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzKSkudG9CZVRydXRoeSgpO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgY29uc3QgeyBtb3ZlZFN0b3JpZXNDb250ZW50IH0gPSBnZXRNb3ZlZFN0b3JpZXNEYXRhKCk7XHJcblxyXG4gICAgICBleHBlY3QobW92ZWRTdG9yaWVzQ29udGVudC5zdG9yeU9uZSkubm90LnRvQ29udGFpbihvcHRpb25zLm5hbWUpO1xyXG4gICAgICBleHBlY3QobW92ZWRTdG9yaWVzQ29udGVudC5zdG9yeVR3bykubm90LnRvQ29udGFpbihvcHRpb25zLm5hbWUpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vdmVkU3Rvcmllc0NvbnRlbnQuc3RvcnlPbmUpLnRvQ29udGFpbignLi9pbmRleCcpO1xyXG4gICAgICBleHBlY3QobW92ZWRTdG9yaWVzQ29udGVudC5zdG9yeVR3bykudG9Db250YWluKCcuL2luZGV4Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChgc2hvdWxkIGFwcGVuZCBzdG9yeWJvb2sgQ1NGIGRlZmF1bHQgZXhwb3J0YCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB7IHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzLCBnZXRNb3ZlZFN0b3JpZXNEYXRhIH0gPSBzZXR1cCgpO1xyXG5cclxuICAgICAgZXhwZWN0KHRyZWUuZXhpc3RzKHBhdGhUb1N0b3JpZXNXaXRoaW5SZWFjdEV4YW1wbGVzKSkudG9CZVRydXRoeSgpO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgY29uc3QgeyBtb3ZlZFN0b3JpZXNFeHBvcnROYW1lcywgbW92ZWRTdG9yaWVzQ29udGVudCB9ID0gZ2V0TW92ZWRTdG9yaWVzRGF0YSgpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vdmVkU3Rvcmllc0NvbnRlbnQuc3RvcnlPbmUpLnRvQ29udGFpbihcclxuICAgICAgICBzdHJpcEluZGVudHNgXHJcbiAgICAgICAgZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgICAgICAgdGl0bGU6ICdDb21wb25lbnRzLyR7bW92ZWRTdG9yaWVzRXhwb3J0TmFtZXMuc3RvcnlPbmV9JyxcclxuICAgICAgICAgIGNvbXBvbmVudDogJHttb3ZlZFN0b3JpZXNFeHBvcnROYW1lcy5zdG9yeU9uZX0sXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGAsXHJcbiAgICAgICk7XHJcbiAgICAgIGV4cGVjdChtb3ZlZFN0b3JpZXNDb250ZW50LnN0b3J5VHdvKS50b0NvbnRhaW4oXHJcbiAgICAgICAgc3RyaXBJbmRlbnRzYFxyXG4gICAgICAgIGV4cG9ydCBkZWZhdWx0IHtcclxuICAgICAgICAgIHRpdGxlOiAnQ29tcG9uZW50cy8ke21vdmVkU3Rvcmllc0V4cG9ydE5hbWVzLnN0b3J5VHdvfScsXHJcbiAgICAgICAgICBjb21wb25lbnQ6ICR7bW92ZWRTdG9yaWVzRXhwb3J0TmFtZXMuc3RvcnlUd299LFxyXG4gICAgICAgIH1cclxuICAgICAgYCxcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KGBzaG91bGQgcmVtb3ZlIHBhY2thZ2UtZGVwZW5kZW5jeSBmcm9tIHJlYWN0LWV4YW1wbGVzIHBhY2thZ2UuanNvbmAsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgeyByZWFjdEV4YW1wbGVzQ29uZmlnIH0gPSBzZXR1cCgpO1xyXG5cclxuICAgICAgbGV0IHJlYWN0RXhhbXBsZXNQa2dKc29uID0gcmVhZEpzb248UGFja2FnZUpzb24+KHRyZWUsIGAke3JlYWN0RXhhbXBsZXNDb25maWcucm9vdH0vcGFja2FnZS5qc29uYCk7XHJcblxyXG4gICAgICBleHBlY3QocmVhY3RFeGFtcGxlc1BrZ0pzb24uZGVwZW5kZW5jaWVzKS50b0VxdWFsKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFtvcHRpb25zLm5hbWVdOiBleHBlY3QuYW55KFN0cmluZyksXHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICByZWFjdEV4YW1wbGVzUGtnSnNvbiA9IHJlYWRKc29uPFBhY2thZ2VKc29uPih0cmVlLCBgJHtyZWFjdEV4YW1wbGVzQ29uZmlnLnJvb3R9L3BhY2thZ2UuanNvbmApO1xyXG5cclxuICAgICAgZXhwZWN0KHJlYWN0RXhhbXBsZXNQa2dKc29uLmRlcGVuZGVuY2llcykubm90LnRvRXF1YWwoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgW29wdGlvbnMubmFtZV06IGV4cGVjdC5hbnkoU3RyaW5nKSxcclxuICAgICAgICB9KSxcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgncGFja2FnZS5qc29uIHVwZGF0ZXMnLCAoKSA9PiB7XHJcbiAgICBpdChgc2hvdWxkIHVwZGF0ZSBwYWNrYWdlIG5wbSBzY3JpcHRzYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcbiAgICAgIGxldCBwa2dKc29uID0gcmVhZEpzb24odHJlZSwgYCR7cHJvamVjdENvbmZpZy5yb290fS9wYWNrYWdlLmpzb25gKTtcclxuXHJcbiAgICAgIGV4cGVjdChwa2dKc29uLnNjcmlwdHMpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXHJcbiAgICAgICAgT2JqZWN0IHtcclxuICAgICAgICAgIFwiYnVpbGRcIjogXCJqdXN0LXNjcmlwdHMgYnVpbGRcIixcclxuICAgICAgICAgIFwiY2xlYW5cIjogXCJqdXN0LXNjcmlwdHMgY2xlYW5cIixcclxuICAgICAgICAgIFwiY29kZS1zdHlsZVwiOiBcImp1c3Qtc2NyaXB0cyBjb2RlLXN0eWxlXCIsXHJcbiAgICAgICAgICBcImp1c3RcIjogXCJqdXN0LXNjcmlwdHNcIixcclxuICAgICAgICAgIFwibGludFwiOiBcImp1c3Qtc2NyaXB0cyBsaW50XCIsXHJcbiAgICAgICAgICBcInN0YXJ0XCI6IFwianVzdC1zY3JpcHRzIGRldjpzdG9yeWJvb2tcIixcclxuICAgICAgICAgIFwic3RhcnQtdGVzdFwiOiBcImp1c3Qtc2NyaXB0cyBqZXN0LXdhdGNoXCIsXHJcbiAgICAgICAgICBcInRlc3RcIjogXCJqdXN0LXNjcmlwdHMgdGVzdFwiLFxyXG4gICAgICAgICAgXCJ1cGRhdGUtc25hcHNob3RzXCI6IFwianVzdC1zY3JpcHRzIGplc3QgLXVcIixcclxuICAgICAgICB9XHJcbiAgICAgIGApO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgcGtnSnNvbiA9IHJlYWRKc29uKHRyZWUsIGAke3Byb2plY3RDb25maWcucm9vdH0vcGFja2FnZS5qc29uYCk7XHJcblxyXG4gICAgICBleHBlY3QocGtnSnNvbi5zY3JpcHRzKS50b0VxdWFsKHtcclxuICAgICAgICBkb2NzOiAnYXBpLWV4dHJhY3RvciBydW4gLS1jb25maWc9Y29uZmlnL2FwaS1leHRyYWN0b3IubG9jYWwuanNvbiAtLWxvY2FsJyxcclxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGZsdWVudHVpL21heC1sZW5cclxuICAgICAgICAnYnVpbGQ6bG9jYWwnOiBgdHNjIC1wIC4gLS1tb2R1bGUgZXNuZXh0IC0tZW1pdERlY2xhcmF0aW9uT25seSAmJiBub2RlIC4uLy4uL3NjcmlwdHMvdHlwZXNjcmlwdC9ub3JtYWxpemUtaW1wb3J0IC0tb3V0cHV0IGRpc3QvcmVhY3QtZHVtbXkvc3JjICYmIHlhcm4gZG9jc2AsXHJcbiAgICAgICAgYnVpbGQ6ICdqdXN0LXNjcmlwdHMgYnVpbGQnLFxyXG4gICAgICAgIGNsZWFuOiAnanVzdC1zY3JpcHRzIGNsZWFuJyxcclxuICAgICAgICAnY29kZS1zdHlsZSc6ICdqdXN0LXNjcmlwdHMgY29kZS1zdHlsZScsXHJcbiAgICAgICAganVzdDogJ2p1c3Qtc2NyaXB0cycsXHJcbiAgICAgICAgbGludDogJ2p1c3Qtc2NyaXB0cyBsaW50JyxcclxuICAgICAgICBzdGFydDogJ3N0b3J5Ym9vaycsXHJcbiAgICAgICAgc3Rvcnlib29rOiAnc3RhcnQtc3Rvcnlib29rJyxcclxuICAgICAgICB0ZXN0OiAnamVzdCcsXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoYHNob3VsZCBjcmVhdGUgYXBpLWV4dHJhY3Rvci5qc29uYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcblxyXG4gICAgICBleHBlY3QodHJlZS5leGlzdHMoYCR7cHJvamVjdENvbmZpZy5yb290fS9jb25maWcvYXBpLWV4dHJhY3Rvci5qc29uYCkpLnRvQmVGYWxzeSgpO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgZXhwZWN0KHRyZWUuZXhpc3RzKGAke3Byb2plY3RDb25maWcucm9vdH0vY29uZmlnL2FwaS1leHRyYWN0b3IuanNvbmApKS50b0JlVHJ1dGh5KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChgc2hvdWxkIGNyZWF0ZSBhcGktZXh0cmFjdG9yLmxvY2FsLmpzb24gZm9yIHNjcmlwdHM6ZG9jcyB0YXNrIGNvbnN1bXB0aW9uYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcblxyXG4gICAgICBleHBlY3QodHJlZS5leGlzdHMoYCR7cHJvamVjdENvbmZpZy5yb290fS9jb25maWcvYXBpLWV4dHJhY3Rvci5sb2NhbC5qc29uYCkpLnRvQmVGYWxzeSgpO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgZXhwZWN0KHRyZWUuZXhpc3RzKGAke3Byb2plY3RDb25maWcucm9vdH0vY29uZmlnL2FwaS1leHRyYWN0b3IubG9jYWwuanNvbmApKS50b0JlVHJ1dGh5KCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoYG54IHdvcmtzcGFjZSB1cGRhdGVzYCwgKCkgPT4ge1xyXG4gICAgaXQoYHNob3VsZCBzZXQgcHJvamVjdCAnc291cmNlUm9vdCcgaW4gd29ya3NwYWNlLmpzb25gLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGxldCBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcblxyXG4gICAgICBleHBlY3QocHJvamVjdENvbmZpZy5zb3VyY2VSb290KS50b0JlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcblxyXG4gICAgICBleHBlY3QocHJvamVjdENvbmZpZy5zb3VyY2VSb290KS50b0JlKGAke3Byb2plY3RDb25maWcucm9vdH0vc3JjYCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChgc2hvdWxkIHNldCBwcm9qZWN0ICd2TmV4dCcgYW5kICdwbGF0Zm9ybTp3ZWInIHRhZyBpbiBueC5qc29uYCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBsZXQgcHJvamVjdENvbmZpZyA9IHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBvcHRpb25zLm5hbWUpO1xyXG4gICAgICBleHBlY3QocHJvamVjdENvbmZpZy50YWdzKS50b0JlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICBwcm9qZWN0Q29uZmlnID0gcmVhZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIG9wdGlvbnMubmFtZSk7XHJcblxyXG4gICAgICBleHBlY3QocHJvamVjdENvbmZpZy50YWdzKS50b0VxdWFsKFsndk5leHQnLCAncGxhdGZvcm06d2ViJ10pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoYHNob3VsZCB1cGRhdGUgcHJvamVjdCB0YWdzIGluIG54Lmpzb24gaWYgdGhleSBhbHJlYWR5IGV4aXN0YCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBsZXQgcHJvamVjdENvbmZpZyA9IHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBvcHRpb25zLm5hbWUpO1xyXG5cclxuICAgICAgdXBkYXRlUHJvamVjdENvbmZpZ3VyYXRpb24odHJlZSwgb3B0aW9ucy5uYW1lLCB7IC4uLnByb2plY3RDb25maWcsIHRhZ3M6IFsndk5leHQnXSB9KTtcclxuICAgICAgcHJvamVjdENvbmZpZyA9IHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBvcHRpb25zLm5hbWUpO1xyXG5cclxuICAgICAgZXhwZWN0KHByb2plY3RDb25maWcudGFncykudG9FcXVhbChbJ3ZOZXh0J10pO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgcHJvamVjdENvbmZpZyA9IHJlYWRQcm9qZWN0Q29uZmlndXJhdGlvbih0cmVlLCBvcHRpb25zLm5hbWUpO1xyXG5cclxuICAgICAgZXhwZWN0KHByb2plY3RDb25maWcudGFncykudG9FcXVhbChbJ3ZOZXh0JywgJ3BsYXRmb3JtOndlYiddKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZShgLS1zdGF0c2AsICgpID0+IHtcclxuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgICBzZXR1cER1bW15UGFja2FnZSh0cmVlLCB7IG5hbWU6ICdAcHJvai9yZWFjdC1mb28nLCB2ZXJzaW9uOiAnOS4wLjIyJyB9KTtcclxuICAgICAgc2V0dXBEdW1teVBhY2thZ2UodHJlZSwgeyBuYW1lOiAnQHByb2ovcmVhY3QtYmFyJywgdmVyc2lvbjogJzkuMC4zMScgfSk7XHJcbiAgICAgIHNldHVwRHVtbXlQYWNrYWdlKHRyZWUsIHsgbmFtZTogJ0Bwcm9qL3JlYWN0LW9sZCcsIHZlcnNpb246ICc4LjEuMTInIH0pO1xyXG4gICAgICBzZXR1cER1bW15UGFja2FnZSh0cmVlLCB7IG5hbWU6ICdAcHJvai9yZWFjdC1vbGRlcicsIHZlcnNpb246ICc4LjkuMTInIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoYHNob3VsZCBwcmludCBwcm9qZWN0IG5hbWVzIGFuZCBjb3VudCBvZiBob3cgbWFueSBoYXZlIGJlZW4gbWlncmF0ZWRgLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGxvZ2dlckluZm9TcHkgPSBqZXN0LnNweU9uKGxvZ2dlciwgJ2luZm8nKTtcclxuXHJcbiAgICAgIGF3YWl0IGdlbmVyYXRvcih0cmVlLCB7IHN0YXRzOiB0cnVlIH0pO1xyXG5cclxuICAgICAgZXhwZWN0KGxvZ2dlckluZm9TcHkubW9jay5jYWxsc1syXVswXSkudG9FcXVhbCgnTWlncmF0ZWQgKDApOicpO1xyXG4gICAgICBleHBlY3QobG9nZ2VySW5mb1NweS5tb2NrLmNhbGxzWzNdWzBdKS50b0VxdWFsKCcnKTtcclxuICAgICAgZXhwZWN0KGxvZ2dlckluZm9TcHkubW9jay5jYWxsc1s1XVswXSkudG9FcXVhbChgTm90IG1pZ3JhdGVkICgzKTpgKTtcclxuICAgICAgZXhwZWN0KGxvZ2dlckluZm9TcHkubW9jay5jYWxsc1s2XVswXSkudG9FcXVhbChcclxuICAgICAgICBleHBlY3Quc3RyaW5nQ29udGFpbmluZyhzdHJpcEluZGVudHNgXHJcbiAgICAgIC0gQHByb2ovcmVhY3QtZHVtbXlcclxuICAgICAgLSBAcHJvai9yZWFjdC1mb29cclxuICAgICAgLSBAcHJvai9yZWFjdC1iYXJcclxuICAgICAgYCksXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBsb2dnZXJJbmZvU3B5Lm1vY2tDbGVhcigpO1xyXG5cclxuICAgICAgYXdhaXQgZ2VuZXJhdG9yKHRyZWUsIG9wdGlvbnMpO1xyXG4gICAgICBhd2FpdCBnZW5lcmF0b3IodHJlZSwgeyBzdGF0czogdHJ1ZSB9KTtcclxuXHJcbiAgICAgIGV4cGVjdChsb2dnZXJJbmZvU3B5Lm1vY2suY2FsbHNbMl1bMF0pLnRvRXF1YWwoJ01pZ3JhdGVkICgxKTonKTtcclxuICAgICAgZXhwZWN0KGxvZ2dlckluZm9TcHkubW9jay5jYWxsc1s1XVswXSkudG9FcXVhbChgTm90IG1pZ3JhdGVkICgyKTpgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTtcclxuXHJcbi8vID09PT0gaGVscGVycyA9PT09XHJcblxyXG5mdW5jdGlvbiBzZXR1cER1bW15UGFja2FnZShcclxuICB0cmVlOiBUcmVlLFxyXG4gIG9wdGlvbnM6IEFzc2VydGVkU2NoZW1hICZcclxuICAgIFBhcnRpYWw8eyB2ZXJzaW9uOiBzdHJpbmc7IGRlcGVuZGVuY2llczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjsgY29tcGlsZXJPcHRpb25zOiBUc0NvbmZpZ1snY29tcGlsZXJPcHRpb25zJ10gfT4sXHJcbikge1xyXG4gIGNvbnN0IHdvcmtzcGFjZUNvbmZpZyA9IHJlYWRXb3Jrc3BhY2VDb25maWd1cmF0aW9uKHRyZWUpO1xyXG4gIGNvbnN0IGRlZmF1bHRzID0ge1xyXG4gICAgdmVyc2lvbjogJzkuMC4wLWFscGhhLjQwJyxcclxuICAgIGRlcGVuZGVuY2llczoge1xyXG4gICAgICBbYEAke3dvcmtzcGFjZUNvbmZpZy5ucG1TY29wZX0vcmVhY3QtbWFrZS1zdHlsZXNgXTogJ145LjAuMC1hbHBoYS4zOCcsXHJcbiAgICAgIFtgQCR7d29ya3NwYWNlQ29uZmlnLm5wbVNjb3BlfS9yZWFjdC10aGVtZWBdOiAnXjkuMC4wLWFscGhhLjEzJyxcclxuICAgICAgW2BAJHt3b3Jrc3BhY2VDb25maWcubnBtU2NvcGV9L3JlYWN0LXV0aWxpdGllc2BdOiAnXjkuMC4wLWFscGhhLjI1JyxcclxuICAgICAgdHNsaWI6ICdeMi4xLjAnLFxyXG4gICAgICBzb21lVGhpcmRQYXJ0eURlcDogJ14xMS4xLjInLFxyXG4gICAgfSxcclxuICAgIGNvbXBpbGVyT3B0aW9uczogeyBiYXNlVXJsOiAnLicsIHR5cGVSb290czogWycuLi8uLi9ub2RlX21vZHVsZXMvQHR5cGVzJywgJy4uLy4uL3R5cGluZ3MnXSB9LFxyXG4gIH07XHJcblxyXG4gIGNvbnN0IG5vcm1hbGl6ZWRPcHRpb25zID0geyAuLi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xyXG4gIGNvbnN0IHBrZ05hbWUgPSBub3JtYWxpemVkT3B0aW9ucy5uYW1lO1xyXG4gIGNvbnN0IG5vcm1hbGl6ZWRQa2dOYW1lID0gcGtnTmFtZS5yZXBsYWNlKGBAJHt3b3Jrc3BhY2VDb25maWcubnBtU2NvcGV9L2AsICcnKTtcclxuICBjb25zdCBwYXRocyA9IHtcclxuICAgIHJvb3Q6IGBwYWNrYWdlcy8ke25vcm1hbGl6ZWRQa2dOYW1lfWAsXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgdGVtcGxhdGVzID0ge1xyXG4gICAgcGFja2FnZUpzb246IHtcclxuICAgICAgbmFtZTogcGtnTmFtZSxcclxuICAgICAgdmVyc2lvbjogbm9ybWFsaXplZE9wdGlvbnMudmVyc2lvbixcclxuICAgICAgc2NyaXB0czoge1xyXG4gICAgICAgIGJ1aWxkOiAnanVzdC1zY3JpcHRzIGJ1aWxkJyxcclxuICAgICAgICBjbGVhbjogJ2p1c3Qtc2NyaXB0cyBjbGVhbicsXHJcbiAgICAgICAgJ2NvZGUtc3R5bGUnOiAnanVzdC1zY3JpcHRzIGNvZGUtc3R5bGUnLFxyXG4gICAgICAgIGp1c3Q6ICdqdXN0LXNjcmlwdHMnLFxyXG4gICAgICAgIGxpbnQ6ICdqdXN0LXNjcmlwdHMgbGludCcsXHJcbiAgICAgICAgc3RhcnQ6ICdqdXN0LXNjcmlwdHMgZGV2OnN0b3J5Ym9vaycsXHJcbiAgICAgICAgJ3N0YXJ0LXRlc3QnOiAnanVzdC1zY3JpcHRzIGplc3Qtd2F0Y2gnLFxyXG4gICAgICAgIHRlc3Q6ICdqdXN0LXNjcmlwdHMgdGVzdCcsXHJcbiAgICAgICAgJ3VwZGF0ZS1zbmFwc2hvdHMnOiAnanVzdC1zY3JpcHRzIGplc3QgLXUnLFxyXG4gICAgICB9LFxyXG4gICAgICBkZXBlbmRlbmNpZXM6IG5vcm1hbGl6ZWRPcHRpb25zLmRlcGVuZGVuY2llcyxcclxuICAgIH0sXHJcbiAgICB0c0NvbmZpZzoge1xyXG4gICAgICBjb21waWxlck9wdGlvbnM6IG5vcm1hbGl6ZWRPcHRpb25zLmNvbXBpbGVyT3B0aW9ucyxcclxuICAgIH0sXHJcbiAgICBqZXN0Q29uZmlnOiBzdHJpcEluZGVudHNgXHJcbiAgICAgIGNvbnN0IHsgY3JlYXRlQ29uZmlnIH0gPSByZXF1aXJlKCdAZmx1ZW50dWkvc2NyaXB0cy9qZXN0L2plc3QtcmVzb3VyY2VzJyk7XHJcbiAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XHJcblxyXG4gICAgICBjb25zdCBjb25maWcgPSBjcmVhdGVDb25maWcoe1xyXG4gICAgICAgIHNldHVwRmlsZXM6IFtwYXRoLnJlc29sdmUocGF0aC5qb2luKF9fZGlybmFtZSwgJ2NvbmZpZycsICd0ZXN0cy5qcycpKV0sXHJcbiAgICAgICAgc25hcHNob3RTZXJpYWxpemVyczogWydAZmx1ZW50dWkvamVzdC1zZXJpYWxpemVyLW1ha2Utc3R5bGVzJ10sXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBjb25maWc7XHJcbiAgICBgLFxyXG4gIH07XHJcblxyXG4gIHRyZWUud3JpdGUoYCR7cGF0aHMucm9vdH0vcGFja2FnZS5qc29uYCwgc2VyaWFsaXplSnNvbih0ZW1wbGF0ZXMucGFja2FnZUpzb24pKTtcclxuICB0cmVlLndyaXRlKGAke3BhdGhzLnJvb3R9L3RzY29uZmlnLmpzb25gLCBzZXJpYWxpemVKc29uKHRlbXBsYXRlcy50c0NvbmZpZykpO1xyXG4gIHRyZWUud3JpdGUoYCR7cGF0aHMucm9vdH0vamVzdC5jb25maWcuanNgLCB0ZW1wbGF0ZXMuamVzdENvbmZpZyk7XHJcblxyXG4gIGFkZFByb2plY3RDb25maWd1cmF0aW9uKHRyZWUsIHBrZ05hbWUsIHtcclxuICAgIHJvb3Q6IHBhdGhzLnJvb3QsXHJcbiAgICBwcm9qZWN0VHlwZTogJ2xpYnJhcnknLFxyXG4gICAgdGFyZ2V0czoge30sXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB0cmVlO1xyXG59XHJcbiJdLCJ2ZXJzaW9uIjozfQ==
