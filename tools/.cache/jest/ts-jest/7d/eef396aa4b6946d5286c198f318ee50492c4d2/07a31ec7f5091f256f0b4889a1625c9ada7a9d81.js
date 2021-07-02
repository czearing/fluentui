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
const path = require('path');
const devkit_1 = require('@nrwl/devkit');
function default_1(host, schema) {
  return __awaiter(this, void 0, void 0, function*() {
    const options = normalizeOptions(host, schema);
    addFiles(host, options);
    if (!options.skipFormat) {
      yield devkit_1.formatFiles(host);
    }
  });
}
exports.default = default_1;
function normalizeOptions(host, options) {
  if (options.name.length === 0) {
    throw new Error('name is required');
  }
  const defaults = { skipFormat: false };
  const projectRoot = 'tools';
  return Object.assign(Object.assign(Object.assign({}, defaults), options), {
    projectRoot,
    paths: {
      generators: path.join(projectRoot, 'generators'),
    },
  });
}
function addFiles(host, options) {
  const templateOptions = Object.assign(Object.assign(Object.assign({}, options), devkit_1.names(options.name)), {
    offsetFromRoot: devkit_1.offsetFromRoot(options.projectRoot),
    tmpl: '',
  });
  devkit_1.generateFiles(
    host,
    path.join(__dirname, 'files'),
    path.join(options.paths.generators, options.name),
    templateOptions,
  );
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJmaWxlIjoiQzpcXFVzZXJzXFxjemVhclxcRG9jdW1lbnRzXFxmbHVlbnR1aVxcdG9vbHNcXGdlbmVyYXRvcnNcXHdvcmtzcGFjZS1nZW5lcmF0b3JcXGluZGV4LnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHlDQUF1RjtBQU12RixtQkFBK0IsSUFBVSxFQUFFLE1BQXlDOztRQUNsRixNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFL0MsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTtZQUN2QixNQUFNLG9CQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekI7SUFDSCxDQUFDO0NBQUE7QUFSRCw0QkFRQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBVSxFQUFFLE9BQTBDO0lBQzlFLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztLQUNyQztJQUVELE1BQU0sUUFBUSxHQUFHLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3ZDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQztJQUU1QixxREFDSyxRQUFRLEdBQ1IsT0FBTyxLQUNWLFdBQVcsRUFDWCxLQUFLLEVBQUU7WUFDTCxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDO1NBQ2pELElBQ0Q7QUFDSixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsSUFBVSxFQUFFLE9BQXlCO0lBQ3JELE1BQU0sZUFBZSxpREFDaEIsT0FBTyxHQUNQLGNBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQ3RCLGNBQWMsRUFBRSx1QkFBYyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDbkQsSUFBSSxFQUFFLEVBQUUsR0FDVCxDQUFDO0lBRUYsc0JBQWEsQ0FDWCxJQUFJLEVBQ0osSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUNqRCxlQUFlLENBQ2hCLENBQUM7QUFDSixDQUFDIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcY3plYXJcXERvY3VtZW50c1xcZmx1ZW50dWlcXHRvb2xzXFxnZW5lcmF0b3JzXFx3b3Jrc3BhY2UtZ2VuZXJhdG9yXFxpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBUcmVlLCBmb3JtYXRGaWxlcywgZ2VuZXJhdGVGaWxlcywgbmFtZXMsIG9mZnNldEZyb21Sb290IH0gZnJvbSAnQG5yd2wvZGV2a2l0JztcclxuXHJcbmltcG9ydCB7IFdvcmtzcGFjZUdlbmVyYXRvckdlbmVyYXRvclNjaGVtYSB9IGZyb20gJy4vc2NoZW1hJztcclxuXHJcbmludGVyZmFjZSBOb3JtYWxpemVkU2NoZW1hIGV4dGVuZHMgUmV0dXJuVHlwZTx0eXBlb2Ygbm9ybWFsaXplT3B0aW9ucz4ge31cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIChob3N0OiBUcmVlLCBzY2hlbWE6IFdvcmtzcGFjZUdlbmVyYXRvckdlbmVyYXRvclNjaGVtYSkge1xyXG4gIGNvbnN0IG9wdGlvbnMgPSBub3JtYWxpemVPcHRpb25zKGhvc3QsIHNjaGVtYSk7XHJcblxyXG4gIGFkZEZpbGVzKGhvc3QsIG9wdGlvbnMpO1xyXG5cclxuICBpZiAoIW9wdGlvbnMuc2tpcEZvcm1hdCkge1xyXG4gICAgYXdhaXQgZm9ybWF0RmlsZXMoaG9zdCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBub3JtYWxpemVPcHRpb25zKGhvc3Q6IFRyZWUsIG9wdGlvbnM6IFdvcmtzcGFjZUdlbmVyYXRvckdlbmVyYXRvclNjaGVtYSkge1xyXG4gIGlmIChvcHRpb25zLm5hbWUubGVuZ3RoID09PSAwKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25hbWUgaXMgcmVxdWlyZWQnKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGRlZmF1bHRzID0geyBza2lwRm9ybWF0OiBmYWxzZSB9O1xyXG4gIGNvbnN0IHByb2plY3RSb290ID0gJ3Rvb2xzJztcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIC4uLmRlZmF1bHRzLFxyXG4gICAgLi4ub3B0aW9ucyxcclxuICAgIHByb2plY3RSb290LFxyXG4gICAgcGF0aHM6IHtcclxuICAgICAgZ2VuZXJhdG9yczogcGF0aC5qb2luKHByb2plY3RSb290LCAnZ2VuZXJhdG9ycycpLFxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRGaWxlcyhob3N0OiBUcmVlLCBvcHRpb25zOiBOb3JtYWxpemVkU2NoZW1hKSB7XHJcbiAgY29uc3QgdGVtcGxhdGVPcHRpb25zID0ge1xyXG4gICAgLi4ub3B0aW9ucyxcclxuICAgIC4uLm5hbWVzKG9wdGlvbnMubmFtZSksXHJcbiAgICBvZmZzZXRGcm9tUm9vdDogb2Zmc2V0RnJvbVJvb3Qob3B0aW9ucy5wcm9qZWN0Um9vdCksXHJcbiAgICB0bXBsOiAnJyxcclxuICB9O1xyXG5cclxuICBnZW5lcmF0ZUZpbGVzKFxyXG4gICAgaG9zdCxcclxuICAgIHBhdGguam9pbihfX2Rpcm5hbWUsICdmaWxlcycpLFxyXG4gICAgcGF0aC5qb2luKG9wdGlvbnMucGF0aHMuZ2VuZXJhdG9ycywgb3B0aW9ucy5uYW1lKSxcclxuICAgIHRlbXBsYXRlT3B0aW9ucyxcclxuICApO1xyXG59XHJcbiJdLCJ2ZXJzaW9uIjozfQ==
