export interface ServerOptions {
	port?: number;
	lobbyPassword?: string;
}

export interface ServerInstance {
	start(): Promise<void>;
	stop(): Promise<void>;
}
