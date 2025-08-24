/**
 * ESPN MCP Server - Core Module with Lazy Loading
 * Complete implementation with intelligent caching and multiple transport options
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
declare const ESPN_TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            save: {
                type: string;
                description: string;
            };
        };
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            save?: undefined;
        };
    };
})[];
declare class LazyESPNService {
    private cache;
    private baseURL;
    private cacheTTL;
    private getTTL;
    private extractSport;
    private fetchData;
    callTool(name: string, args: any): Promise<any>;
    private fetchESPNData;
    private formatResponse;
    private getLeagueFromTool;
    private getTypeFromTool;
    getCacheStats(): {
        size: number;
        activeLoads: number;
        keys: string[];
    };
    clearCache(): void;
}
declare const espnService: LazyESPNService;
declare const server: Server<{
    method: string;
    params?: import("zod").objectOutputType<{
        _meta: import("zod").ZodOptional<import("zod").ZodObject<{
            progressToken: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
        }, "passthrough", import("zod").ZodTypeAny, import("zod").objectOutputType<{
            progressToken: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
        }, import("zod").ZodTypeAny, "passthrough">, import("zod").objectInputType<{
            progressToken: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
        }, import("zod").ZodTypeAny, "passthrough">>>;
    }, import("zod").ZodTypeAny, "passthrough"> | undefined;
}, {
    method: string;
    params?: import("zod").objectOutputType<{
        _meta: import("zod").ZodOptional<import("zod").ZodObject<{}, "passthrough", import("zod").ZodTypeAny, import("zod").objectOutputType<{}, import("zod").ZodTypeAny, "passthrough">, import("zod").objectInputType<{}, import("zod").ZodTypeAny, "passthrough">>>;
    }, import("zod").ZodTypeAny, "passthrough"> | undefined;
}, import("zod").objectOutputType<{
    _meta: import("zod").ZodOptional<import("zod").ZodObject<{}, "passthrough", import("zod").ZodTypeAny, import("zod").objectOutputType<{}, import("zod").ZodTypeAny, "passthrough">, import("zod").objectInputType<{}, import("zod").ZodTypeAny, "passthrough">>>;
}, import("zod").ZodTypeAny, "passthrough">>;
export declare function createTransport(type?: 'stdio'): StdioServerTransport;
export declare function main(): Promise<void>;
export { server, espnService, ESPN_TOOLS };
