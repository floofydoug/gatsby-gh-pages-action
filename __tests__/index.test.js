"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const index_1 = __importDefault(require("../index"));
const originalContext = { ...github.context };
const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];
const gitHubWorkspace = path.resolve('/checkout-tests/workspace');
let inputs = {};
let execSpy;
beforeAll(() => {
    execSpy = jest.spyOn(exec, 'exec').mockImplementation(jest.fn());
    jest.spyOn(io, 'cp').mockImplementation(jest.fn());
    jest.spyOn(core, 'getInput').mockImplementation((name) => {
        return inputs[name];
    });
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
        return {
            owner: 'enriikke',
            repo: 'enriikke.github.io',
        };
    });
    github.context.actor = 'enrikke';
    github.context.ref = 'refs/heads/some-ref';
    github.context.sha = '1234567890123456789012345678901234567890';
    process.env['GITHUB_WORKSPACE'] = gitHubWorkspace;
});
afterAll(() => {
    delete process.env['GITHUB_WORKSPACE'];
    if (originalGitHubWorkspace) {
        process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
    }
    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;
    jest.restoreAllMocks();
});
beforeEach(() => {
    jest.resetModules();
    inputs = {
        'access-token': 'SECRET',
        'skip-publish': 'true',
    };
});
describe('Gatsby Publish action', () => {
    it('returns an error when no access token is given if skip-publish is not true', async () => {
        inputs['access-token'] = '';
        inputs['skip-publish'] = '';
        const setFailedSpy = jest.spyOn(core, 'setFailed');
        await index_1.default();
        expect(setFailedSpy).toBeCalledWith('No personal access token found. Please provide one by setting the `access-token` input for this action, or disable publishing by setting `skip-publish`.');
    });
    it('does not return an error when no access token is given if skip-publish is true', async () => {
        inputs['access-token'] = '';
        inputs['skip-publish'] = 'true';
        await index_1.default();
        await expect(index_1.default()).resolves.not.toThrowError();
    });
    it('skips if deploy branch is the same as the current git head and the repo is the same', async () => {
        inputs['deploy-branch'] = 'some-ref';
        github.context.ref = 'refs/heads/some-ref';
        await expect(index_1.default()).resolves.not.toThrowError();
    });
    it('builds if deploy branch is the same as the current git head but the repo is not the same', async () => {
        inputs['gatsby-args'] = '';
        inputs['deploy-branch'] = 'some-ref';
        inputs['deploy-repo'] = 'deploy-repo';
        github.context.ref = 'refs/heads/some-ref';
        await index_1.default();
        expect(execSpy).toBeCalledWith('npm run build', [], { cwd: '.' });
    });
    it('calls gatsby build without args', async () => {
        inputs['gatsby-args'] = '';
        await index_1.default();
        expect(execSpy).toBeCalledWith('npm run build', [], { cwd: '.' });
    });
    it('calls gatsby build with args', async () => {
        inputs['gatsby-args'] = '--prefix-paths --no-uglify';
        await index_1.default();
        expect(execSpy).toBeCalledWith('npm run build', ['--', '--prefix-paths', '--no-uglify'], { cwd: '.' });
    });
    it('calls gatsby build with working-dir', async () => {
        inputs['gatsby-args'] = '';
        inputs['working-dir'] = '../gatsby-gh-pages-action';
        await index_1.default();
        expect(execSpy).toBeCalledWith('npm run build', [], { cwd: '../gatsby-gh-pages-action' });
    });
    it('calls gatsby build with working-dir and args', async () => {
        inputs['gatsby-args'] = '--prefix-paths --no-uglify';
        inputs['working-dir'] = '../gatsby-gh-pages-action';
        await index_1.default();
        expect(execSpy).toBeCalledWith('npm run build', ['--', '--prefix-paths', '--no-uglify'], {
            cwd: '../gatsby-gh-pages-action',
        });
    });
    it('calls gatsby build with wrong working-dir', async () => {
        inputs['gatsby-args'] = '';
        inputs['working-dir'] = './__tests__';
        await index_1.default();
        expect(execSpy).toBeCalledWith('npm run build', [], { cwd: './__tests__' });
    });
    it('calls gatsby build with git name and email', async () => {
        inputs['gatsby-args'] = '';
        inputs['git-config-name'] = 'git-name';
        inputs['git-config-email'] = 'git-email';
        inputs['skip-publish'] = 'FALSE';
        await index_1.default();
        expect(execSpy).nthCalledWith(4, 'git config user.name', ['git-name'], { cwd: './public' });
        expect(execSpy).nthCalledWith(5, 'git config user.email', ['git-email'], { cwd: './public' });
    });
    it('calls gatsby build without git name and email', async () => {
        inputs['gatsby-args'] = '';
        inputs['skip-publish'] = 'FALSE';
        await index_1.default();
        expect(execSpy).nthCalledWith(4, 'git config user.name', ['enrikke'], { cwd: './public' });
        expect(execSpy).nthCalledWith(5, 'git config user.email', ['enrikke@users.noreply.github.com'], { cwd: './public' });
    });
});
