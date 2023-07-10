package pwm

import (
	"net/http"

	"github.com/nixpare/server/v2"
)

const (
	WORDLE_PROGRAM_NAME = "Wordle.js"
)

var (
	PWM = server.Website {
		Name: "PWM",
		Dir: "C:/Program Files/PareServer/nixpare/pwm",
		MainPages: []string{"/"},
		NoLogPages: []string{"/assets/"},
	}
)

func PWMInit(srv *server.HTTPServer, domain *server.Domain, subdomain *server.Subdomain) error {
	err := srv.Router.TaskManager.NewProcess(WORDLE_PROGRAM_NAME, PWM.Dir, "node", ".")
	if err != nil {
		return err
	}

	err = srv.Router.TaskManager.StartProcess(WORDLE_PROGRAM_NAME)
	if err != nil {
		return err
	}

	return nil
}

func PWMRoute(route *server.Route) {
	err := route.ReverseProxy("http://127.0.0.1:8000")
	if err != nil {
		route.Error(http.StatusBadGateway, "Bad Gateway", err)
	}
}
