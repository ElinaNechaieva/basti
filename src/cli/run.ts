import { readFileSync } from 'node:fs';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { setUpDebugMode } from '#src/common/debug.js';
import { AwsClient } from '#src/aws/common/aws-client.js';

import { handleAsyncErrors, withErrorHandling } from './error/handle-error.js';
import { conflictingOptions } from './yargs/conflicting-options-check.js';
import { optionGroup } from './yargs/option-group-check.js';
import {
  YARGS_AWS_CLIENT_OPTIONS,
  getAwsClientOptions,
} from './yargs/aws-client-options.js';

const pkg: {
  version: string;
} = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url)).toString()
);

setUpDebugMode();
handleAsyncErrors();

void yargs(hideBin(process.argv))
  .version(pkg.version)
  .command(
    ['init', 'i'],
    'Initialize a target to use with Basti',
    yargs =>
      yargs
        .option('rds-instance', {
          type: 'string',
          description: 'ID of the RDS instance to be initialized',
        })
        .option('rds-cluster', {
          type: 'string',
          description: 'ID of the RDS cluster to be initialized',
        })
        .option('custom-target-vpc', {
          type: 'string',
          description: 'VPC of the custom target to be initialized',
        })
        .option('bastion-subnet', {
          type: 'string',
          description: 'ID of the public VPC subnet for the bastion instance',
        })
        .option(...YARGS_AWS_CLIENT_OPTIONS.AWS_PROFILE)
        .option(...YARGS_AWS_CLIENT_OPTIONS.AWS_REGION)
        .check(
          conflictingOptions('rds-cluster', 'rds-instance', 'custom-target-vpc')
        )
        .example([
          ['$0 init', 'Use interactive mode'],
          [
            '$0 --rds-instance <id> --bastion-subnet <id>',
            'Select target and bastion subnet automatically',
          ],
        ]),
    withErrorHandling(async options => {
      const { rdsInstance, rdsCluster, customTargetVpc, bastionSubnet } =
        options;

      AwsClient.setGlobalConfiguration(getAwsClientOptions(options));
      const { handleInit } = await import('./commands/init/init.js');

      const target =
        rdsInstance !== undefined
          ? { rdsInstanceId: rdsInstance }
          : rdsCluster !== undefined
          ? { rdsClusterId: rdsCluster }
          : customTargetVpc !== undefined
          ? { customTargetVpcId: customTargetVpc }
          : undefined;

      await handleInit({ target, bastionSubnet });
    })
  )
  .command(
    ['connect', 'c'],
    'Start port forwarding session with the selected target',
    yargs =>
      yargs
        .option('rds-instance', {
          type: 'string',
          description: 'ID of the RDS instance to connect to',
        })
        .option('rds-cluster', {
          type: 'string',
          description: 'ID of the RDS cluster to connect to',
        })
        .option('custom-target-vpc', {
          type: 'string',
          description: 'VPC of the custom connection target',
        })
        .option('custom-target-host', {
          type: 'string',
          description:
            'Host name or IP address of the custom connection target',
        })
        .option('custom-target-port', {
          type: 'number',
          description: 'Port of the custom connection target',
        })
        .option('local-port', {
          type: 'number',
          description: 'Local port to forward the target to',
        })
        .option(...YARGS_AWS_CLIENT_OPTIONS.AWS_PROFILE)
        .option(...YARGS_AWS_CLIENT_OPTIONS.AWS_REGION)
        .check(
          conflictingOptions('rds-instance', 'rds-cluster', [
            'custom-target-vpc',
            'custom-target-host',
            'custom-target-port',
          ])
        )
        .check(
          optionGroup(
            'custom-target-vpc',
            'custom-target-host',
            'custom-target-port'
          )
        )
        .example([
          ['$0 connect', 'Use interactive mode'],
          [
            '$0 connect --rds-instance <id> --local-port <port>',
            'Select target and local port automatically',
          ],
        ]),
    withErrorHandling(async options => {
      const {
        rdsInstance,
        rdsCluster,
        customTargetVpc,
        customTargetHost,
        customTargetPort,
        localPort,
      } = options;

      AwsClient.setGlobalConfiguration(getAwsClientOptions(options));
      const { handleConnect } = await import('./commands/connect/connect.js');

      const target =
        rdsInstance !== undefined
          ? { rdsInstanceId: rdsInstance }
          : rdsCluster !== undefined
          ? { rdsClusterId: rdsCluster }
          : customTargetVpc !== undefined &&
            customTargetHost !== undefined &&
            customTargetPort !== undefined
          ? {
              customTargetVpcId: customTargetVpc,
              customTargetHost,
              customTargetPort,
            }
          : undefined;

      await handleConnect({ target, localPort });
    })
  )
  .command(
    ['cleanup', 'cl'],
    'Remove all resources created by Basti',
    yargs =>
      yargs
        .option('confirm', {
          type: 'boolean',
          alias: ['c', 'y'],
          description: 'Automatically confirm cleanup',
        })
        .option(...YARGS_AWS_CLIENT_OPTIONS.AWS_PROFILE)
        .option(...YARGS_AWS_CLIENT_OPTIONS.AWS_REGION)
        .example([
          ['$0 cleanup', 'Use interactive mode'],
          ['$0 cleanup -y', 'Confirm cleanup automatically'],
        ]),

    withErrorHandling(async options => {
      const { confirm } = options;

      AwsClient.setGlobalConfiguration(getAwsClientOptions(options));
      const { handleCleanup } = await import('./commands/cleanup/cleanup.js');

      return await handleCleanup({ confirm });
    })
  )
  .demandCommand(1)
  .strict()
  .alias('help', 'h')
  .alias('version', 'v')
  .example([
    ['$0 init', 'Initialize a target in interactive mode'],
    ['$0 connect', 'Start connection in interactive mode'],
    [
      '$0 cleanup',
      'Cleanup Basti resources in interactive mode (requires confirmation)',
    ],
  ])
  .completion('completion', 'Generate completion script for your shell')
  .recommendCommands()
  .wrap(process.stdout.columns)
  .parse();
