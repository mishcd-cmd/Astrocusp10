import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type State = { hasError: boolean; message?: string }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || String(error) }
  }

  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary] caught', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          {!!this.state.message && <Text style={styles.msg}>{this.state.message}</Text>}
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#e8e8e8', fontSize: 18, marginBottom: 8 },
  msg: { color: '#8b9dc3', fontSize: 14, textAlign: 'center' },
})
