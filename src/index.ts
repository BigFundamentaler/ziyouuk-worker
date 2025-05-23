import { createYoga, createSchema } from 'graphql-yoga'
import { createServerAdapter, ServerAdapterInitialContext } from '@whatwg-node/server'
// 导入环境变量定义
import { Env } from './env'
import { getCorsHeaders } from './util/getCorsHeaders'

interface MessageInput {
	role: string
	content: string
}

interface ChatArgs {
	messages: MessageInput[]
	model?: string
	temperature?: number
	max_tokens?: number
}
const resolvers = {
	Query: {
		hello: () => 'Hello from DeepSeek Chat Worker!',
	},
	Mutation: {
		chatWithDeepSeek: async (
			_: unknown,
			args: ChatArgs,
			{ env }: { env: Env }
		) => {
			if (!env || !env.DEEPSEEK_API_KEY) {
				throw new Error(`DEEPSEEK_API_KEY 未配置`)
			}
			const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

			const response = await fetch(DEEPSEEK_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
				},
				body: JSON.stringify({
					model: args.model,
					messages: args.messages,
					temperature: args.temperature,
					max_tokens: args.max_tokens
				})
			})
			if(!response.ok) {
				throw new Error('DeepSeek 请求失败')
			}
			const data = await response.json() as any
			if (!data || !data.choices || !data.choices[0]) {
				throw new Error('DeepSeek API response format unexpected: ' + JSON.stringify(data))
			}
			return data?.choices[0]?.message?.content || 'No response from DeepSeek'
		}
	}
}
const typeDefs = `
  type Message {
    role: String!
    content: String!
  }

  input MessageInput {
    role: String!
    content: String!
  }

  type Query {
    hello: String!
  }

  type Mutation {
    chatWithDeepSeek(
      messages: [MessageInput!]!
      model: String = "deepseek-chat"
      temperature: Float = 0.7
      max_tokens: Int = 2048
    ): String!
  }
`


const yoga = createYoga({
	schema: createSchema({
		typeDefs,
		resolvers
	}),
	graphiql: true,
	landingPage: false,
	cors: {
		origin: ['http://localhost:3000', 'https://ziyou.uk'],
		credentials: true,
		allowedHeaders: ['Content-Type, Authorization'],
		methods: ['GET', 'POST']
	}
})

// export default { fetch: yoga.fetch }
const server = createServerAdapter(yoga)

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// CORS 处理
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: getCorsHeaders(request, env)
			});
		}
		// 仅接受 POST 请求
		// if (request.method !== "POST") {
		// 	return new Response(JSON.stringify({ error: "Method not allowed" }), {
		// 		status: 405,
		// 		headers: { "Content-Type": "application/json" }
		// 	});
		// }
		return server.handleRequest(request, { env } as Partial<ServerAdapterInitialContext>)
	}
}

