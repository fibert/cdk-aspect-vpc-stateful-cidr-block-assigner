import { awscdk, JsonPatch } from 'projen';
const VSCODE_EXTENSIONS = ['esbenp.prettier-vscode', 'dbaeumer.vscode-eslint'];
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Dor Fibert',
  authorAddress: 'dorfib@gmail.com',
  cdkVersion: '2.178.1',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.7.0',
  name: 'cdk-aspect-vpc-stateful-cidr-block-assigner',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/fibert/cdk-aspect-vpc-stateful-cidr-block-assigner.git',

  experimentalIntegRunner: true,

  description: 'CDK Aspect to alter the Amazon VPC subnet CIDR blocks assignment to respect existing CIDR blocks when updating a CDK Vpc construct',

  devContainer: true,

  publishToPypi: {
    distName: 'cdk-aspect-vpc-stateful-cidr-block-assigner',
    module: 'cdk_aspect_vpc_stateful_cidr_block_assigner',
  },
});

const setupTask = project.addTask('devenv:setup');
setupTask.exec('yarn install');
setupTask.spawn(project.buildTask);
project.devContainer?.addTasks(setupTask);
project.npmignore?.exclude('/.devcontainer.json');

const devContainerFile = project.tryFindObjectFile('.devcontainer.json');
devContainerFile?.patch(JsonPatch.replace('/postCreateCommand', 'npx -y projen devenv:setup'));

project.devContainer?.addVscodeExtensions(...VSCODE_EXTENSIONS);
// project.devContainer?.addTasks(project.buildTask);


project.vscode?.extensions.addRecommendations(...VSCODE_EXTENSIONS);

project.addGitIgnore('cdk.out/');
project.addGitIgnore('.vscode/*');
project.addGitIgnore('!.vscode/extensions.json');
project.addGitIgnore('*.subnets.context.json');
project.addGitIgnore('!test/**/*.subnets.context.json');

project.synth();