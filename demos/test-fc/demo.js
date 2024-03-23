import { jsx as _jsx } from "react/jsx-runtime";
import { jsxs as _jsxs } from "react/jsx-runtime";
function Child() {

  return _jsxs("ul", {
    children: [
      _jsx("li", { children: "a" }),
      _jsx("li", { children: "b" }),
      [
        _jsx("li", { children: "c" }),
        _jsx("li", { children: "d" })
      ]
    ]
  });
}
_jsxs("ul", {
  children: [
    _jsx("li", { children: "a" }),
    _jsx("li", { children: "b" }),
    [
      _jsx("li", { children: "c" }),
      _jsx("li", { children: "d" })
    ]
  ]
});

_jsxs(_Fragment, {
  children: [
    _jsx("div", { children: "a" }),
    _jsx("div", { children: "b" })
  ]
})

_jsxs("ul", {
  children: [
    _jsxs(_Fragment, {
      children:
        [
          _jsx("li", { children: "1" }),
          _jsx("li", { children: "2" })
        ]
    }),
    _jsx("li", { children: "3" }),
    _jsx("li", { children: "4" })
  ]
});

_jsx("div", {
  children: _jsxs(_Fragment,
    {
      children: [
        _jsx("p", { children: "1" }),
        _jsx("p", { children: "2" })
      ]
    }
  )
});