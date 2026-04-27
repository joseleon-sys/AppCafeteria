export function jsonBody(schemaRef) {
  return {
    required: false,
    content: {
      'application/json': {
        schema: { $ref: schemaRef },
      },
    },
  };
}

export function requiredJson(schemaRef) {
  return {
    ...jsonBody(schemaRef),
    required: true,
  };
}

export function jsonBodyWithExample(example) {
  return {
    required: false,
    content: {
      'application/json': {
        schema: { type: 'object', additionalProperties: true },
        example,
      },
    },
  };
}

export function authResponses(description) {
  return {
    200: {
      description,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AuthTokens' },
        },
      },
    },
    400: { $ref: '#/components/responses/ValidationError' },
    401: { $ref: '#/components/responses/Unauthorized' },
  };
}

export function basicResponses(description) {
  return {
    200: { description },
    400: { $ref: '#/components/responses/ValidationError' },
  };
}

export function basicSecuredResponses(description) {
  return {
    ...basicResponses(description),
    401: { $ref: '#/components/responses/Unauthorized' },
    403: { $ref: '#/components/responses/Forbidden' },
  };
}

export function listResponses(description, itemRef) {
  const items = itemRef ? { $ref: itemRef } : { type: 'object', additionalProperties: true };

  return {
    200: {
      description,
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items,
          },
        },
      },
    },
    400: { $ref: '#/components/responses/ValidationError' },
  };
}

export function securedListResponses(description, itemRef) {
  return {
    ...listResponses(description, itemRef),
    401: { $ref: '#/components/responses/Unauthorized' },
    403: { $ref: '#/components/responses/Forbidden' },
  };
}

export function securedItemResponses(description, schemaRef, successCode = 200) {
  return {
    [successCode]: {
      description,
      content: {
        'application/json': {
          schema: { $ref: schemaRef },
        },
      },
    },
    400: { $ref: '#/components/responses/ValidationError' },
    401: { $ref: '#/components/responses/Unauthorized' },
    403: { $ref: '#/components/responses/Forbidden' },
    404: { $ref: '#/components/responses/NotFound' },
  };
}

export function childOrderQueryParameters() {
  return [
    { $ref: '#/components/parameters/StatusQuery' },
    { name: 'child_id', in: 'query', required: false, schema: { type: 'string' } },
    { $ref: '#/components/parameters/LimitQuery' },
    { name: 'offset', in: 'query', required: false, schema: { type: 'integer', minimum: 0 } },
    { name: 'from_date', in: 'query', required: false, schema: { type: 'string' } },
    { name: 'to_date', in: 'query', required: false, schema: { type: 'string' } },
  ];
}
