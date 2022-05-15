import React, { Suspense, useState, useEffect, useTransition } from 'react';

const SubCpmt = ({
  count
}) => {
  return <div className="sub">I am sub, request success, count is {count}</div>
}

const Sub = React.lazy(() => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        default: SubCpmt
      })
    }, 5000)
  })
})

const App = () => {
  const [count, setCount] = useState(0);
  

  useEffect(() => {
    const t = setInterval(() => {
      setCount(count => count + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Suspense fallback={<div>loading...</div>}>
        <Sub count={count} />
      </Suspense>
      <div>count is {count}</div>
    </>
  );
};

export default App;

