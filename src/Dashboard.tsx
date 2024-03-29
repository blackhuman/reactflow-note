import { useCallback } from "react"
import { useStoreLocal } from "./store"
import {
  Link,
  useNavigate
} from "react-router-dom"
import { Button } from "./components/ui/button"

function Dashboard() {
  const flowMetaList = useStoreLocal(state => state.flowMetaList)
  const [createFlow, deleteFlow] = useStoreLocal(state => [state.createFlow, state.deleteFlow])
  const navigate = useNavigate()

  const onCreateFlow = useCallback(() => {
    const flowId = createFlow()
    navigate(`/flow/${flowId}`)
  }, [createFlow, navigate])

  const onDelete = useCallback((flowId: string) => {
    deleteFlow(flowId)
  }, [deleteFlow])

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={onCreateFlow}>Add</button>
        {flowMetaList.map(({ id, title }) => (
          <div key={id} className="bg-gray-200 p-2 m-2 rounded-md flex flex-row justify-between">
            <Link to={`/flow/${id}`}>{title}</Link>
            <Button onClick={() => onDelete(id)}>Delete</Button>
          </div>
        ))}
      </div>
    </>
  )
}

export default Dashboard