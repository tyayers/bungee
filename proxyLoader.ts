import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { YAML } from "bun";

export class ProxyLoader {
  private proxies: Map<string, any> = new Map();

  /**
   * Loads all YAML/YML files from the specified directory into the map.
   * Uses each endpoint's basePath as the key.
   */
  async loadProxies(directory: string = "./proxies"): Promise<void> {
    try {
      const files = await readdir(directory);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
      );

      for (const file of yamlFiles) {
        const filePath = join(directory, file);
        const bunFile = Bun.file(filePath);
        const text = await bunFile.text();
        const parsed = YAML.parse(text) as any;

        if (parsed && Array.isArray(parsed.endpoints)) {
          for (const endpoint of parsed.endpoints) {
            if (endpoint.basePath) {
              this.proxies.set(endpoint.basePath, parsed);
            }
          }
        }

        if (parsed) {
          for (let resource of parsed.resources) {
          }
        }
      }
      console.log(
        `Loaded ${this.proxies.size} proxy basePaths from ${directory}`,
      );
    } catch (err) {
      console.error(`Failed to load proxies from ${directory}:`, err);
    }
  }

  /**
   * Returns the proxy configuration that matches the closest (longest) basePath for the given route.
   */
  getProxyMatch(route: string): any | undefined {
    let closestMatch: string | null = null;
    let longestMatchLength = -1;
    let remainingUrl = "";

    for (const basePath of this.proxies.keys()) {
      // Ensure the route matches exactly or continues with a path separator
      if (route.startsWith(basePath) && basePath.length > longestMatchLength) {
        longestMatchLength = basePath.length;
        closestMatch = basePath;
        remainingUrl = route.replace(basePath, "");
      }
    }

    if (closestMatch) {
      let match = this.proxies.get(closestMatch);
      match.remainingUrl = remainingUrl;
      return match;
    }

    return undefined;
  }

  /**
   * Helper method to get the current loaded map.
   */
  getProxiesMap(): Map<string, any> {
    return this.proxies;
  }
}
