package main

import (
	"fmt"
	"os"
	"time"

	"github.com/kardianos/service"
)

// serviceConfig define como o Compass aparece no gerenciador de serviços do OS.
var serviceConfig = &service.Config{
	Name:        "compass",
	DisplayName: "Compass AI Usage Monitor",
	Description: "Monitors Claude Code usage and syncs to compass.polarisia.com.br",
	// Em --watch sob serviço, usa intervalo padrão. As envs COMPASS_TOKEN/COMPASS_API
	// precisam estar disponíveis pro serviço — gravadas via `service install`.
	Arguments: []string{"service", "run"},
}

// program implementa service.Interface (Start/Stop).
type program struct {
	interval time.Duration
	stop     chan struct{}
}

func (p *program) Start(s service.Service) error {
	p.stop = make(chan struct{})
	go p.loop()
	return nil
}

func (p *program) loop() {
	// Primeira leitura imediata
	tick(true)
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			tick(true)
		case <-p.stop:
			return
		}
	}
}

func (p *program) Stop(s service.Service) error {
	close(p.stop)
	return nil
}

// newService constrói o objeto service com env vars embutidas (pra rodar no boot
// sem depender do shell do usuário).
func newService(interval time.Duration) (service.Service, *program, error) {
	token := os.Getenv("COMPASS_TOKEN")
	api := os.Getenv("COMPASS_API")

	cfg := *serviceConfig
	// Embute as envs na definição do serviço — assim ele tem token/api no boot.
	if token != "" {
		cfg.EnvVars = map[string]string{
			"COMPASS_TOKEN": token,
			"COMPASS_API":   api,
		}
	}

	prog := &program{interval: interval}
	svc, err := service.New(prog, &cfg)
	return svc, prog, err
}

// handleServiceCommand processa `compass service <install|uninstall|start|stop|status|run>`.
func handleServiceCommand(args []string, interval time.Duration) {
	if len(args) == 0 {
		fmt.Println("uso: compass service <install|uninstall|start|stop|restart|status|run>")
		os.Exit(1)
	}

	svc, _, err := newService(interval)
	if err != nil {
		fmt.Fprintln(os.Stderr, "erro ao criar serviço:", err)
		os.Exit(1)
	}

	cmd := args[0]

	switch cmd {
	case "run":
		// Modo invocado pelo gerenciador de serviço do OS — roda em foreground controlado.
		if os.Getenv("COMPASS_TOKEN") == "" {
			fmt.Fprintln(os.Stderr, "[compass] COMPASS_TOKEN não definido — serviço não vai sincronizar")
		}
		ingestClient = NewIngestClient(os.Getenv("COMPASS_API"))
		if err := svc.Run(); err != nil {
			fmt.Fprintln(os.Stderr, "erro no serviço:", err)
			os.Exit(1)
		}

	case "install":
		if os.Getenv("COMPASS_TOKEN") == "" {
			fmt.Fprintln(os.Stderr, "ERRO: defina COMPASS_TOKEN antes de instalar o serviço.")
			fmt.Fprintln(os.Stderr, "  export COMPASS_TOKEN=<seu token do dashboard>")
			fmt.Fprintln(os.Stderr, "  export COMPASS_API=https://compass.polarisia.com.br")
			os.Exit(1)
		}
		if err := svc.Install(); err != nil {
			fmt.Fprintln(os.Stderr, "erro ao instalar:", err)
			os.Exit(1)
		}
		fmt.Println("✓ Serviço Compass instalado.")
		if err := svc.Start(); err != nil {
			fmt.Fprintln(os.Stderr, "instalado, mas falha ao iniciar:", err)
			os.Exit(1)
		}
		fmt.Println("✓ Serviço iniciado. Vai rodar no boot e sincronizar a cada 5 min.")

	case "uninstall":
		_ = svc.Stop()
		if err := svc.Uninstall(); err != nil {
			fmt.Fprintln(os.Stderr, "erro ao desinstalar:", err)
			os.Exit(1)
		}
		fmt.Println("✓ Serviço Compass removido.")

	case "start":
		if err := svc.Start(); err != nil {
			fmt.Fprintln(os.Stderr, "erro ao iniciar:", err)
			os.Exit(1)
		}
		fmt.Println("✓ Serviço iniciado.")

	case "stop":
		if err := svc.Stop(); err != nil {
			fmt.Fprintln(os.Stderr, "erro ao parar:", err)
			os.Exit(1)
		}
		fmt.Println("✓ Serviço parado.")

	case "restart":
		if err := svc.Restart(); err != nil {
			fmt.Fprintln(os.Stderr, "erro ao reiniciar:", err)
			os.Exit(1)
		}
		fmt.Println("✓ Serviço reiniciado.")

	case "status":
		status, err := svc.Status()
		if err != nil {
			fmt.Fprintln(os.Stderr, "erro ao obter status:", err)
			os.Exit(1)
		}
		switch status {
		case service.StatusRunning:
			fmt.Println("status: rodando")
		case service.StatusStopped:
			fmt.Println("status: parado")
		default:
			fmt.Println("status: desconhecido")
		}

	default:
		fmt.Fprintf(os.Stderr, "comando de serviço inválido: %s\n", cmd)
		os.Exit(1)
	}
}
