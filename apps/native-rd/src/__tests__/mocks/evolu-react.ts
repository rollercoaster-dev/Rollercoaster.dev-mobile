/**
 * Mock for @evolu/react
 *
 * Provides useQuery returning empty rows by default,
 * EvoluProvider as passthrough, and createUseEvolu stub.
 */
import React from 'react';

const useQuery = jest.fn(() => ({ rows: [] }));

const EvoluProvider = ({ children }: { children: React.ReactNode }) => children;

const createUseEvolu = jest.fn(() => jest.fn(() => ({
  create: jest.fn(),
  update: jest.fn(),
})));

module.exports = { useQuery, EvoluProvider, createUseEvolu };
