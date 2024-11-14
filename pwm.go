package pwm

import (
	"net/http"

	"github.com/nixpare/nix"
	"github.com/nixpare/server/v3"
)

func PWMInit(router *server.Router) error {
	_, err := router.TaskManager.NewProcess(WORDLE_PROGRAM_NAME, basedir, "node", ".")
	if err != nil {
		return err
	}

	err = router.TaskManager.StartProcess(WORDLE_PROGRAM_NAME)
	if err != nil {
		return err
	}

	return nil
}

func PWM() http.Handler {
	return nix.NewHandler(func(ctx *nix.Context) {
		err := ctx.ReverseProxy(proxy_addr)
		if err != nil {
			ctx.Error(http.StatusBadGateway, "Bad Gateway", err)
		}
	}, nix.ConnectToMainOption(), nix.EnableRecoveryOption())
}
