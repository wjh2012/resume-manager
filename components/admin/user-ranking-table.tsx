import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface UserRanking {
  userId: string
  email: string
  name: string | null
  totalTokens: number
  totalCost: number
  requestCount: number
}

interface UserRankingTableProps {
  data: UserRanking[]
}

export function UserRankingTable({ data }: UserRankingTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>사용자별 사용량 순위</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">순위</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>이름</TableHead>
              <TableHead className="text-right">총 토큰</TableHead>
              <TableHead className="text-right">추정 비용</TableHead>
              <TableHead className="text-right">요청 수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((user, index) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {user.totalTokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${user.totalCost.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.requestCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
