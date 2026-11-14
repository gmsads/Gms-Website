
// export default {
//   async fetch(request, env) {
//     const url = new URL(request.url);

//     if (url.pathname === "/health") {
//       return new Response(
//         JSON.stringify({
//           success: true,
//           message: "GMS Cloudflare Worker is running"
//         }),
//         {
//           status: 200,
//           headers: {
//             "Content-Type": "application/json"
//           }
//         }
//       );
//     }

//     return new Response(
//       JSON.stringify({
//         success: false,
//         message: "CRM routes are not connected yet"
//       }),
//       {
//         status: 404,
//         headers: {
//           "Content-Type": "application/json"
//         }
//       }
//     );
//   }
// };


export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "GMS Cloudflare Worker is running"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "CRM routes are not connected yet"
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};

export class Backend {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response("GMS Backend Durable Object is running");
  }
}
