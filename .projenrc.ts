import { awscdk } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Dor Fibert',
  authorAddress: 'dorfib@gmail.com',
  cdkVersion: '2.178.1',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.7.0',
  name: '@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/dorfib/cdk-aspect-vpc-stateful-cidr-block-assigner.git',

  // deps: [],                /* Runtime dependencies of this module. */
  description: 'CDK Aspect to alter the Amazon VPC subnet CIDR blocks assignment to respect existing CIDR blocks when updating a CDK Vpc construct',
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.vscode?.extensions.addRecommendations('dbaeumer.vscode-eslint', 'esbenp.prettier-vscode');

project.addGitIgnore('cdk.out/');
project.addGitIgnore('.vscode/');
project.addGitIgnore('*.subnets.context.json');
project.addGitIgnore('!test/**/*.subnets.context.json');

project.synth();