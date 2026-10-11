import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Nome da área, para a mensagem e o log. */
  area: string
  children: ReactNode
}

/** Captura erros de render (try/catch em volta do JSX não captura). */
export class ErrorBoundary extends Component<Props, { erro: Error | null }> {
  state = { erro: null as Error | null }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error(`[${this.props.area}]`, erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div role="alert" className="m-3 flex flex-col gap-2 rounded-xl border border-meta-atrasada-bg bg-card p-5">
        <strong className="type-title text-meta-atrasada-fg">Algo deu errado em {this.props.area}.</strong>
        <span className="type-small text-ink-2">{this.state.erro.message}</span>
        <button type="button" onClick={() => this.setState({ erro: null })} className="self-start rounded-md border border-line-strong bg-card px-3 py-2 type-small hover:bg-muted">
          Tentar de novo
        </button>
      </div>
    )
  }
}
