/**
 * Modern ESPN MCP Server with Latest 2025 Features
 * Supports: Resources, Prompts, Tools, HTTP Streaming, Session Management
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import express from "express";
export declare function createModernESPNServer(): Server;
export declare function createHTTPServer(): express.Application;
export declare function runSTDIOServer(): Promise<void>;
export declare function runHTTPServer(port?: number): Promise<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>>;
