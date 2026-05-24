package main

import "fmt"

// thousands formata int64 com separador de milhar (ex: 1234567 -> "1,234,567").
func thousands(n int64) string {
	if n == 0 {
		return "0"
	}
	negative := n < 0
	if negative {
		n = -n
	}
	out := ""
	for n > 0 {
		segment := n % 1000
		n /= 1000
		if n > 0 {
			out = fmt.Sprintf(",%03d%s", segment, out)
		} else {
			out = fmt.Sprintf("%d%s", segment, out)
		}
	}
	if negative {
		out = "-" + out
	}
	return out
}
