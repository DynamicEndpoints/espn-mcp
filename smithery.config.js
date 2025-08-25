/**
 * Smithery Build Configuration
 * Customizes esbuild options for ESPN MCP Server deployment
 */
export default {
  esbuild: {
    // Mark external packages that shouldn't be bundled
    external: [
      // Node.js built-ins are automatically external
      "express", 
      "cors",
      "axios",
      "date-fns",
      "@modelcontextprotocol/sdk"
    ],
    
    // Enable minification for production
    minify: true,
    
    // Set Node.js target version (matches Dockerfile)
    target: "node20",
    
    // Optimize for speed and size
    treeShaking: true,
    
    // Keep function names for better debugging
    keepNames: true,
    
    // Source maps for debugging in production
    sourcemap: true
  }
};