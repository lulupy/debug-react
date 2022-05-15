import React, {
  Suspense,
  useState,
  useEffect,
  useTransition,
  Fragment
} from "react";

const sleep = (durationMs) =>
  new Promise((resolve) => setTimeout(() => resolve(), durationMs));
const wrapPromise = (promise) => {
  let result;
  promise.then(
    (value) => {
      result = { type: "success", value };
    },
    (value) => {
      result = { type: "error", value };
    }
  );
  return {
    read() {
      if (result === undefined) {
        throw promise;
      }
      if (result.type === "error") {
        throw result.value;
      }
      return result.value;
    }
  };
};
const createResource = (durationMs) => {
  return wrapPromise(sleep(durationMs).then(() => "FETCHED RESULT"));
};
const Sub = ({ count }) => {
  const [resource, setResource] = useState(undefined);
  const [isPending, startTransition] = useTransition({ timeoutMs: 5000 });
  // return React.createElement("div", {
  //   children: [
  //     React.createElement(
  //       "button",
  //       {
  //         onClick() {
  //           startTransition(() => {
  //             setResource(createResource(4000));
  //           });
  //           // setResource(createResource(4000));
  //         }
  //       },
  //       "CLICK ME"
  //     ),
  //     React.createElement(
  //       "pre",
  //       {},
  //       JSON.stringify({ count, isPending }, null, 2)
  //     ),
  //     resource === undefined ? "Initial state" : resource.read()
  //   ]
  // });
  return (

    <div>
      <button
        onClick={() => {
          startTransition(() => {
            setResource(createResource(4000));
          });
          // setResource(createResource(4000));
        }}
      >
        CLICK ME
      </button>
      <pre>{JSON.stringify({ count, isPending }, null, 2)}</pre>
      {resource === undefined ? "Initial state" : resource.read()}
    </div>
  );
};
const App = (props) => {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setS((x) => x + 1);
    }, 1000);
    return () => {
      clearInterval(t);
    };
  }, []);
  // return React.createElement(
  //   Fragment,
  //   {
  //     children: [
  //       React.createElement(
  //         Suspense,
  //         {
  //           fallback: React.createElement("div", {}, "loading...")
  //         },
  //         React.createElement(Sub, { count: s })
  //       ),
  //       React.createElement(
  //         'div',

  //       )
  //     ]
  //   }

  // );
  // return React.createElement(Fragment, {
  //   children: [
  //     React.createElement(Suspense, {
  //       fallback: React.createElement("div", {
  //         children: "loading..."
  //       }),
  //       children: React.createElement(Sub, { count: s })
  //     }),
  //     React.createElement("div", {
  //       children: s
  //     })
  //   ]
  // });
  return (
  <>
    <Suspense fallback={<div>loading...</div>}>
      <Sub count={s} />
    </Suspense>
    <div>{s}</div>
  </>
  );
};


export default App