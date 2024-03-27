import { useCallback } from "react"
import { useStoreLocal } from "./store"
import {
  Link,
  useNavigate
} from "react-router-dom"

function Dashboard() {
  const flowMetaList = useStoreLocal(state => state.flowMetaList)
  const createFlow = useStoreLocal(state => state.createFlow)
  const navigate = useNavigate()

  const onCreateFlow = useCallback(() => {
    const flowId = createFlow()
    navigate(`/flow/${flowId}`)
  }, [createFlow, navigate])

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={onCreateFlow}>Add</button>
        {flowMetaList.map(({ id, title }) => (
          <div key={id} className="bg-gray-200 p-2 m-2 rounded-md">
            <Link to={`/flow/${id}`}>{title}</Link>
          </div>
        ))}
      </div>
    </>
  )
}

export default Dashboard