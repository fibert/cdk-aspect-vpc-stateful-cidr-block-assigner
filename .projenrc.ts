import { awscdk } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Dor Fibert',
  authorAddress: 'dorfib@gmail.com',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.7.0',
  name: 'cdk-aspect-vpc-stateful-cidr-block-assigner',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/dorfib/cdk-aspect-vpc-stateful-cidr-block-assigner.git',

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();