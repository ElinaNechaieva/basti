import { EC2Client, EC2ServiceException } from "@aws-sdk/client-ec2";
import { AwsClient } from "../common/aws-client.js";
import { AwsAccessDeniedError, AwsError } from "../common/aws-error.js";

export const ec2Client = new AwsClient({
  client: EC2Client,
  errorHandler,
});

export async function errorHandler<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      error instanceof EC2ServiceException &&
      error.name === "UnauthorizedOperation"
    ) {
      throw new AwsAccessDeniedError();
    }
    if (
      error instanceof EC2ServiceException &&
      error.message.toLocaleLowerCase().includes("instance profile")
    ) {
      throw new AwsInstanceProfileNotFoundError();
    }
    if (
      error instanceof EC2ServiceException &&
      error.message.toLowerCase().includes("volume attached")
    ) {
      throw new AwsNoRootVolumeAttachedError();
    }
    throw error;
  }
}

export class AwsInstanceProfileNotFoundError extends AwsError {
  constructor() {
    super("Instance profile not found");
  }
}

export class AwsNoRootVolumeAttachedError extends AwsError {
  constructor() {
    super("No root volume attached to the EC2 instance");
  }
}
