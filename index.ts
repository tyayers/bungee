import { YAML } from "bun";
import vm from "node:vm";
import { ProxyLoader } from "./proxyLoader.ts";

const loader = new ProxyLoader();
await loader.loadProxies("./proxies");
const contexts: any[] = [];
for (let i = 0; i < 50; i++) {
  let newContext = {
    print: function (content: string) {
      console.log(content);
    },
    context: {
      responseContent: "",
      getVariable: function (name: string) {
        return this.responseContent;
      },
      setVariable: function (name: string, content: string) {
        this.responseContent = content;
      },
    },
  };
  vm.createContext(newContext);
  contexts.push(newContext);
}
// const script = new vm.Script(flow.resources[0].content);

const server = Bun.serve({
  port: 3000,
  routes: {
    "/*": async (req) => {
      let pieces = req.url.split("/");
      pieces.splice(0, 3);
      let path = "/" + pieces.join("/");
      const match = loader.getProxyMatch(path);
      // const match = loader.getProxiesArray()[0];

      if (!match) {
        return new Response("Page not found", { status: 404 });
      } else {
        if (!match.config.stream) {
          // no stream
          let url = match.config.targets[0].url;
          // const response = await fetch(url + "/json");
          const response = await fetch(url + match.remainingUrl);
          let context = contexts.pop();
          context.context.responseContent = await response.text();
          // run scripts
          if (match.config.resources && match.config.resources.length > 0)
            match.config.resources[0].runtimeScript.runInContext(context);
          let newResponse = new Response(context.context.responseContent);
          contexts.push(context);
          return newResponse;
          // return response;
        } else {
          // stream
          console.log(JSON.stringify(match));
          return new Response(JSON.stringify(match));
        }
      }

      // let pieces = req.url.split("/");
      // pieces.splice(0, 3);
      // let path = pieces.join("/");

      // let url = flow.targets[0].url;
      // const response = await fetch(url + "/" + path);

      // // third fastest - run javascript on response
      // context1.context.responseContent = await response.text();
      // script.runInContext(context1);
      // response.headers.append("X-TEST-HEADER", "Hello world!");

      // let newResponse = new Response(async function* () {
      //   if (response && response.body) {
      //     for await (const chunk of response.body) {
      //       let chunkString = Buffer.from(chunk).toString("utf-8");
      //       // console.log(chunkString);
      //       context1.context.responseContent = chunkString;
      //       script.runInContext(context1);
      //       yield context1.context.responseContent;
      //     }
      //   }
      // });
      // return newResponse;
    },
  },
});

console.log(`Listening on ${server.url}`);
