const isNil = (val: any): val is null | undefined => {
  return val === null || val === undefined;
}

const sleep = (delay: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}
export {
  isNil,
  sleep
}