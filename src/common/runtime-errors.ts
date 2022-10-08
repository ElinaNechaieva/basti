import { ResourceType } from './resource-type.js';

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

export class RuntimeError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(
      cause !== undefined ? `${message}. ${getErrorMessage(cause)}` : message
    );

    this.cause = cause;
  }
}

export class UnexpectedStateError extends RuntimeError {
  constructor(cause?: RuntimeError) {
    super(`Unexpected state`, cause);
  }
}

export class ResourceNotFoundError extends RuntimeError {
  public readonly resourceType: ResourceType;
  public readonly resourceId?: string;

  constructor(resourceType: ResourceType, resourceId?: string) {
    super(
      `Resource of type ${resourceType} with id "${
        resourceId ?? 'unknown'
      }" not found`
    );

    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

export class ResourceDamagedError extends RuntimeError {
  public readonly resourceType: ResourceType;
  public readonly resourceId: string;
  public readonly detail: string;

  constructor(resourceType: ResourceType, resourceId: string, detail: string) {
    super(`${resourceType} "${resourceId}" is damaged: ${detail}`);

    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.detail = detail;
  }
}